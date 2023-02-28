function enemies(p1, p2) {
    if (!p1 || !p2) return false;
    return p1[0] != p2[0];
}

class Square {
    constructor(board, loc) {
        this.board = board;
        this.loc = loc;
        this.color = (loc.x+loc.y)%2 == 1 ? '#aaa' : '#fff';
        this.piece = null;
    }

    get rect() {
        const w = this.board.w/8;
        const h = this.board.h/8;
        const x = this.loc.x*w;
        const y = (7-this.loc.y)*h;
        return {x, y, w, h};
    }

    get imPoint() {
        const im = this.board.images[this.piece];
        const {x, y, w, h} = this.rect;
        const imx = x+(w-im.naturalWidth)/2;
        const imy = y+(h-im.naturalHeight)/2;
        return {x: imx, y: imy};
    }
    
    contains(p) {
        const {x, y, w, h} = this.rect;
        return p.x > x && p.x < x + w && p.y > y && p.y < y + h;
    }

    draw(ctx) {
        if (this.board.dragging && this.board.canMove(this.board.dragging.sq, this)) {
            ctx.fillStyle = '#faa';
        } else {
            ctx.fillStyle = this.color;
        }
        const {x, y, w, h} = this.rect;
        ctx.fillRect(x, y, w, h);
        if (this.piece && !this.dragging) {
            const im = this.board.images[this.piece];
            const imp = this.imPoint;
            ctx.drawImage(im, imp.x, imp.y);
        }
    }
}

function add(a, b) {
    return {x: a.x+b.x, y: a.y+b.y};
}

function sub(a, b) {
    return {x: a.x-b.x, y: a.y-b.y};
}

class MovingPiece {
    constructor(board, sq, p, delta) {
        this.board = board;
        this.sq = sq;
        this.p = p;
        this.delta = delta;
        this.sq.dragging = true;
    }

    draw(ctx) {
        const p = add(this.p, this.delta);
        ctx.drawImage(this.board.images[this.sq.piece], p.x, p.y);
    }
}

class Board {
    constructor(canvas) {
        this.canvas = canvas;
        this.w = canvas.width;
        this.h = canvas.height;
        this.squares = [];
        for (let i=0; i<8; i++) {
            this.squares[i] = [];
            for (let j=0; j<8; j++) {
                this.squares[i][j] = new Square(this, {x: i, y: j});
                if (j == 1) this.squares[i][j].piece = 'WP';
                if (j == 6) this.squares[i][j].piece = 'BP';
            }
        }
        this.squares[1][0].piece = 'WN';
        this.squares[6][0].piece = 'WN';
        this.squares[1][7].piece = 'BN';
        this.squares[6][7].piece = 'BN';
        this.squares[2][0].piece = 'WB';
        this.squares[5][0].piece = 'WB';
        this.squares[2][7].piece = 'BB';
        this.squares[5][7].piece = 'BB';
        this.squares[0][0].piece = 'WR';
        this.squares[7][0].piece = 'WR';
        this.squares[0][7].piece = 'BR';
        this.squares[7][7].piece = 'BR';
        this.squares[3][0].piece = 'WQ';
        this.squares[3][7].piece = 'BQ';
        this.squares[4][0].piece = 'WK';
        this.squares[4][7].piece = 'BK';
    }

    allSquares(fn) {
        for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
                fn(this.squares[i][j]);
            }
        }
    }

    oneAwayFrom(sq, piece) {
        let psq;
        this.allSquares(function(sq) {
            if (sq.piece == piece) psq = sq;
        });
        const dx = Math.abs(sq.loc.x - psq.loc.x);
        const dy = Math.abs(sq.loc.y - psq.loc.y);
        return dx <= 1 && dy <= 1;
    }

    // Square holds your king's position
    inCheck(color, sq) {
        for (let x=0; x<8; x++) {
            for (let y=0; y<8; y++) {
                const oppsq = this.squares[x][y];
                if (!oppsq.piece || oppsq.piece[0] == color) {
                    continue;
                }
                const opiece = sq.piece;
                sq.piece = color;
                if (this.canCapture(oppsq, sq)) {
                    sq.piece = opiece;
                    return true;
                }
                sq.piece = opiece;
            }
        }
    }

    canMoveBishop(sq, tosq) {
        const dy = Math.abs(tosq.loc.y - sq.loc.y);
        const dx = Math.abs(tosq.loc.x - sq.loc.x);
        if (dy == 0 || dx != dy) return false;
        const diry = (tosq.loc.y - sq.loc.y)/dy;
        const dirx = (tosq.loc.x - sq.loc.x)/dx;
        for (let i=1; i<dy; i++) {
            if (this.squares[sq.loc.x + dirx*i][sq.loc.y + diry*i].piece) return false;
        }
        if (!tosq.piece || enemies(sq.piece, tosq.piece)) return true;
    }

    canMoveRook(sq, tosq) {
        const dy = Math.abs(tosq.loc.y - sq.loc.y);
        const dx = Math.abs(tosq.loc.x - sq.loc.x);
        const diry = (tosq.loc.y - sq.loc.y)/dy;
        const dirx = (tosq.loc.x - sq.loc.x)/dx;
        if ((dx != 0 && dy != 0) || (dx == dy)) return false;
        if (dx != 0) {
            for (let i=1; i<dx; i++) {
                if (this.squares[sq.loc.x + dirx*i][sq.loc.y].piece) return false;
            }
        }
        if (dy != 0) {
            for (let i=1; i<dy; i++) {
                if (this.squares[sq.loc.x][sq.loc.y + diry*i].piece) return false;
            }
        }
        if (!tosq.piece || enemies(sq.piece, tosq.piece)) return true;
    }

    canCapture(sq, tosq) {
        if (sq.piece == 'WP') {
            if (tosq.loc.y == sq.loc.y+1 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
            if (tosq.loc.y == sq.loc.y+1 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
        } else if (sq.piece == 'BP') {
            if (tosq.loc.y == sq.loc.y-1 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
            if (tosq.loc.y == sq.loc.y-1 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
        } else {
            return this.canMove(sq, tosq);
        }
    }

    canMove(sq, tosq) {
        if (sq.piece == 'WP') {
            if (sq.loc.y == 1) {
                if (tosq.loc.y == 2 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == 3 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == 2 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
            } else {
                if (tosq.loc.y == sq.loc.y+1 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == sq.loc.y+1 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
            }
        }
        if (sq.piece == 'BP') {
            if (sq.loc.y == 6) {
                if (tosq.loc.y == 5 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == 4 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == 6 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
            } else {
                if (tosq.loc.y == sq.loc.y-1 && tosq.loc.x == sq.loc.x && !tosq.piece) return true;
                if (tosq.loc.y == sq.loc.y-1 && Math.abs(tosq.loc.x - sq.loc.x) == 1 && enemies(sq.piece, tosq.piece)) return true;
            }
        }
        if (sq.piece == 'WN' || sq.piece == 'BN') {
            const dy = Math.abs(sq.loc.y - tosq.loc.y);
            const dx = Math.abs(sq.loc.x - tosq.loc.x);
            if (((dy == 2 && dx == 1) || (dy == 1 && dx == 2)) && (!tosq.piece || enemies(sq.piece, tosq.piece))) return true;
        }
        if (sq.piece == 'WB' || sq.piece == 'BB') {
            return this.canMoveBishop(sq, tosq);
        }
        if (sq.piece == 'WR' || sq.piece == 'BR') {
            return this.canMoveRook(sq, tosq);
        }
        if (sq.piece == 'WQ' || sq.piece == 'BQ') {
            return this.canMoveBishop(sq, tosq) || this.canMoveRook(sq, tosq);
        }
        if (sq.piece == 'WK' || sq.piece == 'BK') {
            const dy = Math.abs(sq.loc.y - tosq.loc.y);
            const dx = Math.abs(sq.loc.x - tosq.loc.x);
            if (dx <= 1 && dy <= 1 && !(dx == 0 && dy == 0) && (!tosq.piece || enemies(sq.piece, tosq.piece))) {
                // One away from enemy king
                if (this.oneAwayFrom(tosq, sq.piece[0] == 'W' ? 'BK' : 'WK')) return false;
                // Another piece can capture
                return !this.inCheck(sq.piece[0], tosq);
            }
        }
    }

    convert(e) {
        const x = e.clientX-this.canvas.getBoundingClientRect().x;
        const y = e.clientY-this.canvas.getBoundingClientRect().y;
        return {x, y}
    }

    mousedown(e) {
        const p = this.convert(e);
        this.allSquares(sq => {
            if (sq.contains(p) && sq.piece) {
                this.dragging = new MovingPiece(this, sq, p, sub(sq.imPoint, p));
            }
        });
        this.repaint();
    }

    stopDragging() {
        if (this.dragging) {
            this.dragging.sq.dragging = false;
            this.dragging = null;
            this.repaint();
        }
    }

    pointSquare(p) {
        const x = Math.floor(p.x/this.w*8);
        const y = 7-Math.floor(p.y/this.h*8);
        return this.squares[x][y];
    }

    mouseout(e) {
        this.stopDragging();
    }

    mouseup(e) {
        if (this.dragging) {
            const sq = this.pointSquare(this.convert(e));
            if (sq != this.dragging.sq && this.canMove(this.dragging.sq, sq)) {
                sq.piece = this.dragging.sq.piece;
                this.dragging.sq.piece = null;
            }
            this.stopDragging();
        }
    }

    mousemove(e) {
        if (this.dragging) {
            this.dragging.p = this.convert(e);
            this.repaint();
        }
    }

    repaint() {
        const ctx = this.canvas.getContext('2d');
        this.allSquares(sq => sq.draw(ctx));
        if (this.dragging) {
            this.dragging.draw(ctx);
        }
    }
}

$ = q => document.querySelector(q);
$$ = q => [...document.querySelectorAll(q)];

window.addEventListener('load', e => {
    const canvas = $('#board');
    const board = new Board(canvas);
    const images = {};
    let nLoaded = 0;
    board.images = images;
    ['BP', 'WP', 'WN', 'BN', 'WB', 'BB', 'WR', 'BR', 'WQ', 'BQ', 'WK', 'BK'].forEach(piece => {
        images[piece] = new Image();
        images[piece].addEventListener('load', e => {
            nLoaded++;
            if (nLoaded == 12) {
                board.repaint();
            }
        });
        images[piece].src = `image/${piece}.png`;
    });
    canvas.addEventListener('mousedown', e => {
        board.mousedown(e);
    });
    canvas.addEventListener('mouseup', e => {
        board.mouseup(e);
    });
    canvas.addEventListener('mousemove', e => {
        board.mousemove(e);
    });
    canvas.addEventListener('mouseout', e => {
        board.mouseout(e);
    });
});
