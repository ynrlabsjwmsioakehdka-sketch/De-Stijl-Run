import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

const MondrianSketch: React.FC = () => {
  const sketchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let myP5: p5;

    if (sketchRef.current) {
      const sketch = (p: p5) => {
        // --- CONSTANTS & CONFIG ---
        const CANVAS_WIDTH = 800;
        const CANVAS_HEIGHT = 600;
        
        // Physics & Game settings
        const INITIAL_SPEED = 6;
        let scrollSpeed = INITIAL_SPEED;
        const GRAVITY = 0.8;
        const JUMP_FORCE = -17; // Slightly stronger jump for snappier feel
        const SPEED_INCREMENT = 0.001;
        
        // Mondrian Palette
        const C_RED = '#E7000B';    
        const C_BLUE = '#0045AD';   
        const C_YELLOW = '#FFD600'; 
        const C_WHITE = '#F0F0F0';  
        const C_BLACK = '#080808';  
        const C_BG = '#FFFFFF';     
        
        const PALETTE_WEIGHTED = [
            C_RED, C_BLUE, C_YELLOW, 
            C_WHITE, C_WHITE, C_WHITE, C_WHITE, 
            C_BLACK 
        ]; 

        // --- STATE VARIABLES ---
        let runner: Runner;
        let buildings: Building[] = [];
        let particles: Particle[] = [];
        let debris: Debris[] = []; // For death animation
        let bgOffset = 0;
        let frameCount = 0;
        let score = 0;
        let gameState: 'PLAYING' | 'GAMEOVER' = 'PLAYING';
        let highScore = 0;
        let shakeMagnitude = 0; // Screen shake effect

        // --- CLASSES ---
        
        class Particle {
            x: number; y: number; vx: number; vy: number; life: number; color: string; size: number;
            constructor(x: number, y: number, color: string) {
                this.x = x; this.y = y;
                this.vx = p.random(-2, 0); 
                this.vy = p.random(-1, 1);
                this.life = 255;
                this.color = color;
                this.size = p.random(3, 8);
            }
            update() {
                this.x += this.vx - scrollSpeed * 0.5; 
                this.y += this.vy;
                this.life -= 12;
                this.size *= 0.92;
            }
            draw() {
                p.noStroke();
                const c = p.color(this.color);
                c.setAlpha(this.life);
                p.fill(c);
                p.rect(this.x, this.y, this.size, this.size);
            }
        }

        class Debris {
            x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; ang: number; vAng: number;
            constructor(x: number, y: number, color: string) {
                this.x = x; 
                this.y = y;
                this.vx = p.random(-5, 5);
                this.vy = p.random(-10, -2);
                this.w = p.random(5, 15);
                this.h = p.random(5, 15);
                this.color = color;
                this.ang = p.random(p.TWO_PI);
                this.vAng = p.random(-0.2, 0.2);
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += GRAVITY * 0.5;
                this.ang += this.vAng;
            }
            draw() {
                p.push();
                p.translate(this.x, this.y);
                p.rotate(this.ang);
                p.fill(this.color);
                p.stroke(C_BLACK);
                p.strokeWeight(2);
                p.rect(0, 0, this.w, this.h);
                p.pop();
            }
        }

        class Runner {
          x: number;
          y: number;
          w: number;
          h: number;
          vy: number;
          onGround: boolean;
          coyoteTimer: number; // Frames allowed to jump after leaving edge
          jumpBufferTimer: number; // Frames to remember jump press before landing

          constructor() {
            this.x = 100; 
            this.y = 200;
            this.w = 32;
            this.h = 32;
            this.vy = 0;
            this.onGround = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
          }

          update(groundY: number, frontWallY: number) {
            // Manage Input Buffers
            if (this.coyoteTimer > 0) this.coyoteTimer--;
            if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

            // 1. Wall Collision Check
            // Check if the wall "ahead" (at right edge of player) is solid and high enough to hit
            const wallCollisionTolerance = 12; // Allow stepping up small bumps
            if (frontWallY < this.y + this.h - wallCollisionTolerance) {
               // The ground ahead is higher than our feet. CRASH.
               this.die();
               shakeMagnitude = 15;
               return;
            }

            // 2. Physics & Gravity
            this.vy += GRAVITY;
            this.y += this.vy;

            // 3. Ground Landing Logic
            // We use the groundY (center of player) to determine support
            if (this.vy >= 0 && this.y + this.h >= groundY) {
              this.y = groundY - this.h;
              this.vy = 0;
              this.onGround = true;
              this.coyoteTimer = 8; // Reset coyote time (8 frames grace)
              
              // Execute buffered jump if one was queued
              if (this.jumpBufferTimer > 0) {
                  this.executeJump();
              }
              
              if (frameCount % 10 === 0 && scrollSpeed > 0) {
                  particles.push(new Particle(this.x, this.y + this.h, C_BLACK));
              }
            } else {
              this.onGround = false;
            }
            
            // Limit fall speed
            this.vy = Math.min(this.vy, 20);

            // 4. Pit Death Check
            if (this.y > CANVAS_HEIGHT + 100) {
                this.die();
                shakeMagnitude = 10;
            }
          }

          pressJump() {
             this.jumpBufferTimer = 8; // Queue this jump request for 8 frames
             
             // If on ground OR within grace period (coyote time), jump immediately
             if (this.onGround || this.coyoteTimer > 0) {
                 this.executeJump();
             }
          }

          executeJump() {
            this.vy = JUMP_FORCE;
            this.onGround = false;
            this.coyoteTimer = 0; // Consumed
            this.jumpBufferTimer = 0; // Consumed
              
            // Burst particles
            for(let i=0; i<8; i++) {
                particles.push(new Particle(this.x + p.random(this.w), this.y + this.h, C_BLACK));
            }
          }

          die() {
             if (gameState === 'GAMEOVER') return;
             gameState = 'GAMEOVER';
             // Explode into debris
             for(let i=0; i<20; i++) {
                 debris.push(new Debris(this.x + this.w/2, this.y + this.h/2, p.random(PALETTE_WEIGHTED)));
             }
             if (score > highScore) highScore = Math.floor(score);
          }

          draw() {
            if (gameState === 'GAMEOVER') return;

            p.push();
            // Shadow trail
            p.fill(0, 0, 0, 40);
            p.noStroke();
            p.rect(this.x - 6, this.y + 6, this.w, this.h);

            // Main Body
            p.stroke(C_BLACK);
            p.strokeWeight(3);
            p.fill(C_BLACK);
            
            // Squash and stretch
            let dw = 0; 
            let dh = 0;
            if (!this.onGround) {
                dw = -4; dh = 4; // Stretch
            } else if (Math.abs(this.vy) > 1 && this.onGround) {
                dw = 4; dh = -4; // Squash
            }

            p.rect(this.x - dw/2, this.y - dh, this.w + dw, this.h + dh);
            
            // Stylized Center
            p.fill(C_WHITE);
            p.noStroke();
            const pad = 8;
            p.rect(this.x + pad - dw/2, this.y + pad - dh, this.w - pad*2 + dw, this.h - pad*2 + dh);
            p.pop();
          }
        }

        class Building {
          x: number;
          y: number;
          w: number;
          h: number;
          type: 'SOLID' | 'GAP';
          subdivisions: {x: number, y: number, w: number, h: number, color: string}[];

          constructor(x: number, w: number, type: 'SOLID' | 'GAP', hOverride?: number) {
            this.x = x;
            this.w = w;
            this.type = type;
            
            if (this.type === 'SOLID') {
              if (hOverride !== undefined) {
                  this.h = hOverride;
              } else {
                  const levels = Math.floor(p.random(2, 7)); 
                  this.h = levels * 60 + 40; 
              }
              this.y = CANVAS_HEIGHT - this.h;
            } else {
              this.h = 0;
              this.y = CANVAS_HEIGHT + 2000; 
            }

            this.subdivisions = [];
            if (this.type === 'SOLID') {
              this.generateMondrianPattern(0, 0, this.w, this.h, 0);
            }
          }

          generateMondrianPattern(lx: number, ly: number, lw: number, lh: number, depth: number) {
            if (lw < 50 || lh < 50) {
               this.addRect(lx, ly, lw, lh);
               return;
            }

            if (depth > 1 && p.random() < 0.3) {
               this.addRect(lx, ly, lw, lh);
               return;
            }
            
            if (depth > 5) { 
               this.addRect(lx, ly, lw, lh);
               return;
            }

            const splitHorz = p.random() > 0.5;
            
            if (splitHorz) {
               const splitRatio = p.random(0.3, 0.7);
               const splitH = Math.floor(lh * splitRatio);
               this.generateMondrianPattern(lx, ly, lw, splitH, depth + 1);
               this.generateMondrianPattern(lx, ly + splitH, lw, lh - splitH, depth + 1);
            } else {
               const splitRatio = p.random(0.3, 0.7);
               const splitW = Math.floor(lw * splitRatio);
               this.generateMondrianPattern(lx, ly, splitW, lh, depth + 1);
               this.generateMondrianPattern(lx + splitW, ly, lw - splitW, lh, depth + 1);
            }
          }

          addRect(lx: number, ly: number, lw: number, lh: number) {
             const col = p.random(PALETTE_WEIGHTED);
             this.subdivisions.push({ x: lx, y: ly, w: lw, h: lh, color: col });
          }

          update() {
            this.x -= scrollSpeed;
          }

          draw() {
            if (this.type === 'GAP') return;

            p.push();
            p.translate(this.x, this.y);
            
            p.stroke(C_BLACK);
            p.strokeWeight(4); 

            for (const sub of this.subdivisions) {
              p.fill(sub.color);
              p.rect(sub.x, sub.y, sub.w, sub.h);
              
              if (sub.color === C_WHITE && sub.w > 60 && sub.h > 60 && p.random() > 0.85) {
                  p.push();
                  p.noStroke();
                  p.fill(245); 
                  p.rect(sub.x + 10, sub.y + 10, sub.w - 20, sub.h - 20);
                  p.pop();
              }
            }
            
            p.noFill();
            p.stroke(C_BLACK);
            p.strokeWeight(6);
            p.rect(0, 0, this.w, this.h);
            p.pop();
          }

          isOffScreen() {
            return (this.x + this.w < -200);
          }
        }

        // --- HELPER FUNCTIONS ---

        function getGroundHeightAt(x: number): number {
          for (const b of buildings) {
            if (x >= b.x && x < b.x + b.w) {
              return b.y;
            }
          }
          return CANVAS_HEIGHT + 2000; 
        }

        function spawnBuilding() {
          const lastBuilding = buildings[buildings.length - 1];
          let startX = 0;
          if (lastBuilding) {
            startX = lastBuilding.x + lastBuilding.w;
          }

          if (buildings.length === 0) {
            buildings.push(new Building(0, CANVAS_WIDTH, 'SOLID'));
            return;
          }

          const isGap = p.random() < 0.35; 
          const prevWasGap = lastBuilding && lastBuilding.type === 'GAP';
          
          if (isGap && !prevWasGap) {
             const gapWidth = p.random(120, 220 + score * 0.05);
             buildings.push(new Building(startX, gapWidth, 'GAP'));
          } else {
             const width = p.random(200, 500);
             
             let lastSolidY = CANVAS_HEIGHT - 100;
             for(let i=buildings.length-1; i>=0; i--){
                if(buildings[i].type === 'SOLID') {
                    lastSolidY = buildings[i].y;
                    break;
                }
             }

             const maxYDiff = 140; 
             const minY = Math.max(160, lastSolidY - maxYDiff);
             const maxY = Math.min(CANVAS_HEIGHT - 60, lastSolidY + 300);
             
             const rawNewY = p.random(minY, maxY);
             const snappedY = Math.floor(rawNewY / 40) * 40;
             const h = CANVAS_HEIGHT - snappedY;

             buildings.push(new Building(startX, width, 'SOLID', h));
          }
        }

        function resetGame() {
            runner = new Runner();
            buildings = [];
            particles = [];
            debris = [];
            score = 0;
            scrollSpeed = INITIAL_SPEED;
            gameState = 'PLAYING';
            shakeMagnitude = 0;
            spawnBuilding();
            while (buildings[buildings.length-1].x < CANVAS_WIDTH * 2) {
               spawnBuilding();
            }
        }

        // --- P5 SETUP & DRAW ---

        p.setup = () => {
          p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
          p.frameRate(60);
          resetGame();
        };

        p.keyPressed = () => {
            if (p.key === ' ' || p.keyCode === p.UP_ARROW) {
                if (gameState === 'PLAYING') {
                    runner.pressJump();
                } else if (gameState === 'GAMEOVER') {
                    resetGame();
                }
            }
        };

        p.mousePressed = () => {
             if (p.mouseX >= 0 && p.mouseX <= CANVAS_WIDTH && p.mouseY >= 0 && p.mouseY <= CANVAS_HEIGHT) {
                if (gameState === 'PLAYING') {
                    runner.pressJump();
                } else if (gameState === 'GAMEOVER') {
                    resetGame();
                }
             }
        };

        p.draw = () => {
          // Screen Shake handling
          p.push();
          if (shakeMagnitude > 0) {
              p.translate(p.random(-shakeMagnitude, shakeMagnitude), p.random(-shakeMagnitude, shakeMagnitude));
              shakeMagnitude *= 0.9; // Decay shake
              if (shakeMagnitude < 0.5) shakeMagnitude = 0;
          }

          p.background(C_BG);
          
          // --- BACKGROUND ---
          p.push();
          const gridSpacing = 100;
          if (gameState === 'PLAYING') {
            bgOffset = (bgOffset - scrollSpeed * 0.2) % gridSpacing;
          }
          
          p.stroke(242); 
          p.strokeWeight(2);
          
          for (let i = bgOffset; i < CANVAS_WIDTH; i += gridSpacing) {
              p.line(i, 0, i, CANVAS_HEIGHT);
          }
          for (let j = 0; j < CANVAS_HEIGHT; j += gridSpacing) {
              p.line(0, j, CANVAS_WIDTH, j);
          }
          
          // Abstract Sun 
          p.noStroke();
          p.fill(C_YELLOW);
          const pulse = Math.sin(p.millis() * 0.002) * 5;
          p.rect(600 - pulse/2, 100 - pulse/2, 90 + pulse, 90 + pulse); 
          p.stroke(C_BLACK);
          p.strokeWeight(4);
          p.noFill();
          p.rect(600 - pulse/2, 100 - pulse/2, 90 + pulse, 90 + pulse);
          p.pop();

          // --- GAME LOOP ---
          if (gameState === 'PLAYING') {
              // Increase difficulty
              scrollSpeed += SPEED_INCREMENT;
              score += scrollSpeed * 0.05;

              // Spawn buildings
              const lastB = buildings[buildings.length - 1];
              if (lastB.x + lastB.w < CANVAS_WIDTH + 800) {
                 spawnBuilding();
              }
              
              // Update objects
              for (let i = buildings.length - 1; i >= 0; i--) {
                buildings[i].update();
                buildings[i].draw();
                if (buildings[i].isOffScreen()) {
                  buildings.splice(i, 1);
                }
              }

              // Collision Probes
              // 1. Center: For landing support
              const groundY = getGroundHeightAt(runner.x + runner.w/2);
              // 2. Front Edge: For detecting wall face impacts
              const frontWallY = getGroundHeightAt(runner.x + runner.w + 2);

              runner.update(groundY, frontWallY);
              runner.draw();
          } else {
              // Game Over State
              for (const b of buildings) {
                  b.draw();
              }
          }

          // Particles
          for (let i = particles.length - 1; i >= 0; i--) {
              particles[i].update();
              particles[i].draw();
              if (particles[i].life <= 0) particles.splice(i, 1);
          }
          for (let i = debris.length - 1; i >= 0; i--) {
              debris[i].update();
              debris[i].draw();
              if (debris[i].y > CANVAS_HEIGHT + 100) debris.splice(i, 1);
          }

          p.pop(); // End Screen Shake

          // Frame
          p.stroke(C_BLACK);
          p.strokeWeight(24);
          p.noFill();
          p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          // UI Layer
          drawUI(p);

          frameCount++;
        };

        function drawUI(p: p5) {
            p.push();
            p.textFont('Courier New');
            p.textStyle(p.BOLD);
            
            // Score
            p.fill(C_BLACK);
            p.noStroke();
            p.textSize(24);
            p.textAlign(p.LEFT, p.TOP);
            p.text(`DIST: ${Math.floor(score)}m`, 40, 40);
            
            if (highScore > 0) {
                p.fill(150);
                p.textSize(16);
                p.text(`HI: ${highScore}m`, 40, 70);
            }

            if (gameState === 'GAMEOVER') {
                p.fill(0, 0, 0, 150);
                p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                
                p.fill(C_WHITE);
                p.stroke(C_BLACK);
                p.strokeWeight(8);
                p.rect(CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT/2 - 100, 400, 200);
                
                p.noStroke();
                p.fill(C_BLACK);
                p.textSize(40);
                p.textAlign(p.CENTER, p.CENTER);
                p.text("GAME OVER", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 30);
                
                p.textSize(16);
                p.fill(C_RED);
                p.text("PRESS SPACE TO RESTART", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
            }
            p.pop();
        }
      };

      myP5 = new p5(sketch, sketchRef.current);
    }

    return () => {
      if (myP5) {
        myP5.remove();
      }
    };
  }, []);

  return <div ref={sketchRef} className="shadow-2xl inline-block cursor-pointer" />;
};

export default MondrianSketch;