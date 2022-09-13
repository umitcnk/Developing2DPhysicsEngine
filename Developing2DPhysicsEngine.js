const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const BALLS = [];
const WALLS = [];

let LEFT, UP, RIGHT, DOWN;
let friction=0.08;


class Vector{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    add(v){
        return new Vector(this.x+v.x, this.y+v.y);
    }
    subt(v){
        return new Vector(this.x-v.x, this.y-v.y);
    }
    mult(n){
        return new Vector(this.x*n, this.y*n);
    }
    unit(){
        if(this.magnitude() === 0)
            return new Vector(0,0);
        else
            return new Vector(this.x/this.magnitude(), this.y/this.magnitude());
    }
    normal(){
        return new Vector(-this.y, this.x).unit();
    }
    magnitude(){
        return Math.sqrt(this.x**2+this.y**2);
    }
    drawVec(start_x, start_y, n, color){
        ctx.beginPath();
        ctx.moveTo(start_x, start_y);
        ctx.lineTo(start_x + this.x * n, start_y + this.y * n);
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.closePath();
    }
    static dot(v1, v2){
        return v1.x*v2.x + v1.y*v2.y;
    }
}

class Ball{
    constructor(x, y, r, m){
        this.pos = new Vector(x,y);
        this.m = m;
        if(this.m === 0)
            this.inv_m = 0;
        else
            this.inv_m = 1/this.m;
        this.r = r;
        this.elasticity = 1;
        this.vel = new Vector(0,0);
        this.acc = new Vector(0,0);
        this.acceleration=1;
        BALLS.push(this);
        this.playerControl = false;
    }
    drawBall(){
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.r, 0, 2*Math.PI);
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.fillStyle = "orange";
        ctx.fill();
        ctx.closePath();
    }
    display(){
        this.vel.drawVec(this.pos.x, this.pos.y, 10, "green");
        ctx.fillStyle = "Black";
        ctx.fillText("m = "+this.m, this.pos.x-10, this.pos.y-5);
        ctx.fillText("e = "+this.elasticity, this.pos.x-10, this.pos.y+5);
    }
    reposition(){
        this.acc = this.acc.unit().mult(this.acceleration);
        this.vel = this.vel.add(this.acc);
        this.vel = this.vel.mult(1-friction);
        this.pos = this.pos.add(this.vel);
    }

}

class Wall{
    constructor(x1,y1,x2,y2){
        this.start = new Vector(x1, y1);
        this.end = new Vector(x2, y2);
        WALLS.push(this);
    }

    drawWall(){
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.closePath();
    }
    wallUnit(){
        return this.end.subt(this.start).unit();
    }
}

function keyControl(a){
    canvas.addEventListener('keydown',function(e){
        if(e.keyCode === 37)
            LEFT = true;
        if(e.keyCode === 38)
            UP = true;
        if(e.keyCode === 39)
            RIGHT = true;
        if(e.keyCode === 40)
            DOWN = true;
    });
    canvas.addEventListener('keyup',function(e){
        if(e.keyCode === 37)
            LEFT = false;
        if(e.keyCode === 38)
            UP = false;
        if(e.keyCode === 39)
            RIGHT = false;
        if(e.keyCode === 40)
            DOWN = false;
    });
        if(LEFT)
            a.acc.x = -a.acceleration;
        if(UP)
            a.acc.y = -a.acceleration;
        if(RIGHT)
            a.acc.x = a.acceleration;
        if(DOWN)
            a.acc.y = a.acceleration;
        if(!UP && !DOWN)
            a.acc.y = 0;
        if(!RIGHT && !LEFT)
            a.acc.x = 0;

}
function randomInt(min, max){
    return Math.floor(Math.random() * (max-min+1) + min);
}

function round(number, precision){
    let factor = 10**precision;
    return Math.round(number*factor)/factor;
}
function closestPointBW(a1,w1){
    let ballToWallStart = w1.start.subt(a1.pos);
    if(Vector.dot(w1.wallUnit(), ballToWallStart) > 0)
        return w1.start;
    
    let wallEndToBall = a1.pos.subt(w1.end);
    if(Vector.dot(w1.wallUnit(), wallEndToBall) > 0)
        return w1.end;
    let closestDist = Vector.dot(w1.wallUnit(), ballToWallStart);
    let closestVec = w1.wallUnit().mult(closestDist);
    return w1.start.subt(closestVec);
}
function coll_det_BW(a1, w1){
    let ballToClosest = closestPointBW(a1, w1).subt(a1.pos);
    if(ballToClosest.magnitude() <= a1.r)
        return true;
}
function coll_det_aa(a1,a2){
    if(a1.r+a2.r>=a2.pos.subt(a1.pos).magnitude())
        return true;
    else    
        return false;
}
function pen_res_BW(a1, w1){
    let penVec = a1.pos.subt(closestPointBW(a1, w1));
    a1.pos = a1.pos.add(penVec.unit().mult(a1.r - penVec.magnitude()));
}
function pen_res_aa(a1,a2){
    let dist = a1.pos.subt(a2.pos);
    let pen_depth = a1.r + a2.r - dist.magnitude();
    let pen_res = dist.unit().mult(pen_depth/a1.inv_m + a2.inv_m);
    a1.pos = a1.pos.add(pen_res.mult(a1.inv_m));
    a2.pos = a2.pos.add(pen_res.mult(-a2.inv_m));

}
function coll_res_BW(a1,w1){
    let normal = a1.pos.subt(closestPointBW(a1,w1)).unit();
    let sepVel = Vector.dot(a1.vel, normal);
    let new_sepVel = -sepVel * a1.elasticity;
    let sepVel_diff = sepVel - new_sepVel;
    a1.vel = a1.vel.add(normal.mult(-sepVel_diff));
}
function coll_res_aa(a1, a2){
    let normal = a1.pos.subt(a2.pos).unit();
    let relVel = a1.vel.subt(a2.vel);
    let sepVel = Vector.dot(relVel, normal);
    let new_sepVel = -sepVel * Math.min(a1.elasticity, a2.elasticity);
    
    let sepVel_diff = new_sepVel - sepVel;
    let impulse = sepVel_diff / (a1.inv_m + a2.inv_m);
    let impulseVec = normal.mult(impulse);

    a1.vel = a1.vel.add(impulseVec.mult(a1.inv_m));
    a2.vel = a2.vel.add(impulseVec.mult(-a2.inv_m));
}

let Player = new Ball(50, 50, 10, 5);
Player.playerControl = true;
for(let i = 0; i<8; i++){
    let newBall = new Ball(randomInt(100,500), randomInt(50,400), randomInt(20,50), randomInt(0,10));
    newBall.elasticity = randomInt(0,10)/10;
}

let Wall1 = new Wall(300, 400, 550, 200);
let Wall2 = new Wall(100, 150, 400, 250);

let edge1 = new Wall(0, 0, canvas.clientWidth, 0);
let edge2 = new Wall(canvas.clientWidth, 0, canvas.clientWidth, canvas.clientHeight);
let edge3 = new Wall(canvas.clientWidth, canvas.clientHeight, 0, canvas.clientHeight);
let edge4 = new Wall(0, canvas.clientHeight, 0, 0);

function mainLoop(){
    ctx.clearRect(0 , 0, canvas.clientWidth, canvas.clientHeight);
    BALLS.forEach((a, index) => {
        a.drawBall();
        if(a.playerControl){
            keyControl(a)
        }
        WALLS.forEach((w) => {
            if(coll_det_BW(BALLS[index], w)){
                pen_res_BW(BALLS[index], w);
                coll_res_BW(BALLS[index], w);
            }
        })
        for(let i = index+1; i<BALLS.length; i++){
            if(coll_det_aa(BALLS[index],BALLS[i])){
                pen_res_aa(BALLS[index],BALLS[i]);
                coll_res_aa(BALLS[index],BALLS[i]);
            }
        }
        a.display();
        a.reposition();
    });
    WALLS.forEach((w) => {
        w.drawWall();
    })
    requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);