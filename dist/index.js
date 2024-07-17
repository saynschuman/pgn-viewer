/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Chessground } from "chessground";
import { uciToMove } from "chessground/util";
import { makeSquare, makeUci, opposite } from "chessops";
import { charToRole, parseSquare, parseUci } from "chessops";
import { Chess } from "chessops/chess";
import { lichessRules, scalachessCharPair } from "chessops/compat";
import { makeBoardFen, makeFen, parseFen } from "chessops/fen";
import { parseComment, parsePgn, startingPosition, transform, } from "chessops/pgn";
import { makeSanAndPlay, makeSanVariation, parseSan } from "chessops/san";
import { setupPosition } from "chessops/variant";
export { Chess, parseFen, parseSquare, makeSanVariation, Chessground, uciToMove, charToRole, parsePgn, startingPosition, };
const symbolClass = (move) => {
    const classes = {
        good: move.nags.includes(1),
        mistake: move.nags.includes(2),
        brilliant: move.nags.includes(3),
        blunder: move.nags.includes(4),
        interesting: move.nags.includes(5),
        inaccuracy: move.nags.includes(6),
    };
    return Object.keys(classes)
        .filter((key) => classes[key])
        .join(" ");
};
const hasSymbol = (move) => move.nags.length > 0 ? "with-symbol" : "";
export const renderMove = (ctrl) => (move, isVariation = false) => {
    return `<span data-ply="${move.ply}" data-nags="${move.nags}" data-fen="${move.fen}" data-uci="${move.uci}" data-path="${move.path.path}" data-variation="${isVariation}" class="move ${hasSymbol(move)} ${symbolClass(move)} ${isVariation ? "variation" : ""}" id="${ctrl.path.path === move.path.path ? "active" : ""}"> ${move.san} </span>`;
};
export const moveTurn = (move) => `${Math.floor((move.ply - 1) / 2) + 1}.`;
export const emptyMove = () => "...";
export const commentNode = (comment) => ({
    text: comment,
    type: "comment",
});
export const indexNode = (turn) => `${turn}`;
export const parenOpen = () => '<span class="paren-element op">(</span>';
export const parenClose = () => '<span class="paren-element cl">)</span>';
export const makeMainVariation = (moveDom, node) => [
    // @ts-ignore
    ...node.data.startingComments.map(commentNode),
    ...makeVariationMoves(moveDom, node),
];
export const makeVariationMoves = (moveDom, node) => {
    let elms = [];
    let variations = [];
    // @ts-ignore
    if (node.data.ply % 2 == 0)
        elms.push(`${moveTurn(node.data)}.. `);
    do {
        const move = node.data;
        // @ts-ignore
        if (move.ply % 2 == 1)
            elms.push(moveTurn(move));
        // @ts-ignore
        elms.push(moveDom(move));
        // @ts-ignore
        move.comments.forEach((comment) => elms.push(commentNode(comment)));
        variations.forEach((variation) => {
            elms = [
                ...elms,
                parenOpen(),
                ...makeVariationMoves(moveDom, variation),
                parenClose(),
            ];
        });
        variations = node.children.slice(1);
        node = node.children[0];
    } while (node);
    return elms;
};
export const makeMoveNodes = (ctrl) => {
    const moveDom = renderMove(ctrl);
    const elms = [];
    let node, variations = ctrl.game.moves.children.slice(1);
    if (ctrl.game.initial.pos.turn == "black" && ctrl.game.mainline[0])
        elms.push(indexNode(ctrl.game.initial.pos.fullmoves), emptyMove());
    // @ts-ignore
    while ((node = (node || ctrl.game.moves).children[0])) {
        const move = node.data;
        // @ts-ignore
        const oddMove = move.ply % 2 == 1;
        // @ts-ignore
        if (oddMove)
            elms.push(indexNode(moveTurn(move)));
        // @ts-ignore
        elms.push(moveDom(move));
        const addEmptyMove = 
        // @ts-ignore
        oddMove &&
            // @ts-ignore
            (variations.length || move.comments.length) &&
            node.children.length;
        if (addEmptyMove)
            elms.push(emptyMove());
        // @ts-ignore
        move.comments.forEach((comment) => elms.push(commentNode(comment)));
        variations.forEach((variation) => 
        // @ts-ignore
        elms.push(makeMainVariation((data) => moveDom(data, true), variation)));
        // @ts-ignore
        if (addEmptyMove)
            elms.push(indexNode(moveTurn(move)), emptyMove());
        variations = node.children.slice(1);
    }
    return elms;
};
export function renderPvMoves(currentFen, pv) {
    const position = setupPosition(lichessRules("standard"), parseFen(currentFen).unwrap());
    const pos = position.unwrap();
    const vnodes = [];
    for (let i = 0; i < pv.length; i++) {
        let text;
        if (pos.turn === "white") {
            text = `${pos.fullmoves}.`;
        }
        else if (i === 0) {
            text = `${pos.fullmoves}...`;
        }
        if (text) {
            vnodes.push({ text });
        }
        const uci = pv[i];
        const san = makeSanAndPlay(pos, parseUci(uci));
        const fen = makeBoardFen(pos.board); // Chessground uses only board fen
        if (san === "--") {
            break;
        }
        vnodes.push({ fen: `${fen}`, san, uci });
    }
    return vnodes;
}
export class Path {
    constructor(path) {
        this.path = path;
        this.size = () => this.path.length / 2;
        this.head = () => this.path.slice(0, 2);
        // returns an invalid path doesn't starting from root
        this.tail = () => new Path(this.path.slice(2));
        this.init = () => new Path(this.path.slice(0, -2));
        this.last = () => this.path.slice(-2);
        this.empty = () => this.path == "";
        this.contains = (other) => this.path.startsWith(other.path);
        this.isChildOf = (parent) => this.init() === parent;
        this.append = (id) => new Path(this.path + id);
        this.equals = (other) => this.path == other.path;
    }
}
Path.root = new Path("");
export function childById(node, id) {
    return node.children.find((child) => { var _a; return ((_a = child.data) === null || _a === void 0 ? void 0 : _a.id) === id; });
}
export function head(path) {
    return path.slice(0, 2);
}
export function tail(path) {
    return path.slice(2);
}
const nodeAtPathFrom = (node, path) => {
    if (path.empty())
        return node;
    const child = childById(node, path.head());
    return child ? nodeAtPathFrom(child, path.tail()) : undefined;
};
export const isMoveNode = (n) => "data" in n;
export const isMoveData = (d) => "uci" in d;
export class Game {
    constructor(initial, moves, players, metadata) {
        this.initial = initial;
        this.moves = moves;
        this.players = players;
        this.metadata = metadata;
        this.nodeAt = (path) => nodeAtPathFrom(this.moves, path);
        this.dataAt = (path) => {
            const node = this.nodeAt(path);
            return node ? (isMoveNode(node) ? node.data : this.initial) : undefined;
        };
        this.title = () => this.players.white.name
            ? [
                this.players.white.title,
                this.players.white.name,
                "vs",
                this.players.black.title,
                this.players.black.name,
            ]
                .filter((x) => x && !!x.trim())
                .join("_")
                .replace(" ", "-")
            : "lichess-pgn-viewer";
        this.pathAtMainlinePly = (ply) => {
            var _a;
            return ply == 0
                ? Path.root
                : ((_a = this.mainline[Math.max(0, Math.min(this.mainline.length - 1, ply == "last" ? 9999 : ply - 1))]) === null || _a === void 0 ? void 0 : _a.path) || Path.root;
        };
        this.hasPlayerName = () => { var _a, _b; return !!(((_a = this.players.white) === null || _a === void 0 ? void 0 : _a.name) || ((_b = this.players.black) === null || _b === void 0 ? void 0 : _b.name)); };
        this.mainline = Array.from(this.moves.mainline());
    }
}
export const parseComments = (strings) => {
    const comments = strings.map(parseComment);
    const reduceTimes = (times) => times.reduce((last, time) => (typeof time == "undefined" ? last : time), undefined);
    return {
        texts: comments.map((c) => c.text).filter((t) => !!t),
        // @ts-ignore
        shapes: comments.flatMap((c) => c.shapes),
        clock: reduceTimes(comments.map((c) => c.clock)),
        emt: reduceTimes(comments.map((c) => c.emt)),
    };
};
export function makeMetadata(headers, lichess) {
    var _a;
    const site = headers.get("source") || headers.get("site");
    const result = headers.get("result");
    const comment = headers.get("comment");
    const tcs = (_a = headers
        .get("timecontrol")) === null || _a === void 0 ? void 0 : _a.split("+").map((x) => parseInt(x));
    const timeControl = tcs && tcs[0]
        ? {
            initial: tcs[0],
            increment: tcs[1] || 0,
        }
        : undefined;
    const orientation = headers.get("orientation");
    return {
        externalLink: site && site.match(/^https?:\/\//) ? site : undefined,
        isLichess: !!(lichess && (site === null || site === void 0 ? void 0 : site.startsWith(lichess))),
        timeControl,
        orientation: orientation === "white" || orientation === "black"
            ? orientation
            : undefined,
        result,
        comment,
    };
}
export class State {
    constructor(pos, path, clocks) {
        this.pos = pos;
        this.path = path;
        this.clocks = clocks;
        this.clone = () => new State(this.pos.clone(), this.path, { ...this.clocks });
    }
}
const makeClocks = (prev, turn, clk) => turn == "white" ? { ...prev, black: clk } : { ...prev, white: clk };
export const makeMoves = (start, moves, metadata) => transform(moves, new State(start, Path.root, {}), (state, node) => {
    const move = parseSan(state.pos, node.san);
    if (!move)
        return undefined;
    const moveId = scalachessCharPair(move);
    const path = state.path.append(moveId);
    const san = makeSanAndPlay(state.pos, move);
    state.path = path;
    const setup = state.pos.toSetup();
    const comments = parseComments(node.comments || []);
    const startingComments = parseComments(node.startingComments || []);
    const shapes = [...comments.shapes, ...startingComments.shapes];
    const ply = (setup.fullmoves - 1) * 2 + (state.pos.turn === "white" ? 0 : 1);
    let clocks = (state.clocks = makeClocks(state.clocks, state.pos.turn, comments.clock));
    if (ply < 2 && metadata.timeControl)
        clocks = {
            white: metadata.timeControl.initial,
            black: metadata.timeControl.initial,
            ...clocks,
        };
    const moveNode = {
        path,
        ply,
        id: moveId,
        move,
        san,
        uci: makeUci(move),
        fen: makeFen(state.pos.toSetup()),
        turn: state.pos.turn,
        check: state.pos.isCheck(),
        comments: comments.texts,
        startingComments: startingComments.texts,
        nags: node.nags || [],
        shapes,
        clocks,
        emt: comments.emt,
    };
    return moveNode;
});
function makePlayers(headers, metadata) {
    const get = (color, field) => {
        const raw = headers.get(`${color}${field}`) || undefined;
        return raw == "?" || raw == "" ? undefined : raw;
    };
    const makePlayer = (color) => {
        const name = get(color, "");
        return {
            name,
            title: get(color, "title"),
            rating: parseInt(get(color, "elo") || "") || undefined,
            isLichessUser: metadata.isLichess &&
                !!(name === null || name === void 0 ? void 0 : name.match(/^[a-z0-9][a-z0-9_-]{0,28}[a-z0-9]$/i)),
        };
    };
    return {
        white: makePlayer("white"),
        black: makePlayer("black"),
    };
}
export const makeGame = (pgn, lichess = false) => {
    var _a, _b;
    const game = parsePgn(pgn)[0] || parsePgn("*")[0];
    const start = startingPosition(game.headers).unwrap();
    const fen = makeFen(start.toSetup());
    const comments = parseComments(game.comments || []);
    const headers = new Map(Array.from(game.headers, ([key, value]) => [key.toLowerCase(), value]));
    const metadata = makeMetadata(headers, lichess);
    const initial = {
        fen,
        turn: start.turn,
        check: start.isCheck(),
        pos: start.clone(),
        comments: comments.texts,
        shapes: comments.shapes,
        clocks: {
            white: ((_a = metadata.timeControl) === null || _a === void 0 ? void 0 : _a.initial) || comments.clock,
            black: ((_b = metadata.timeControl) === null || _b === void 0 ? void 0 : _b.initial) || comments.clock,
        },
    };
    const moves = makeMoves(start, game.moves, metadata);
    const players = makePlayers(headers, metadata);
    return new Game(initial, moves, players, metadata);
};
export class PgnViewer {
    constructor(opts) {
        this.opts = opts;
        this.flipped = false;
        this.pane = "board";
        this.autoScrollRequested = false;
        this.autoplay = false;
        /**
         * Adds a Numeric Annotation Glyph (NAG) to the specified move.
         * @param path The path to the move where the NAG should be added.
         * @param nag The NAG number to add.
         */
        this.addNag = (path, nag) => {
            const node = this.nodeAtPathOrNull(path);
            if (node && node.data) {
                const nags = node.data.nags;
                if (!nags.includes(nag)) {
                    nags.push(nag);
                }
            }
        };
        /**
         * Removes a Numeric Annotation Glyph (NAG) from the specified move.
         * @param path The path to the move where the NAG should be removed.
         * @param nag The NAG number to remove.
         */
        this.removeNag = (path, nag) => {
            const node = this.nodeAtPathOrNull(path);
            if (node && node.data) {
                const nags = node.data.nags;
                const index = nags.indexOf(nag);
                if (index !== -1) {
                    nags.splice(index, 1);
                }
            }
        };
        this.plyPrefix = (node) => {
            var _a, _b;
            return `${Math.floor(((((_a = node === null || node === void 0 ? void 0 : node.data) === null || _a === void 0 ? void 0 : _a.ply) || 0) + 1) / 2)}${(((_b = node === null || node === void 0 ? void 0 : node.data) === null || _b === void 0 ? void 0 : _b.ply) || 0) % 2 === 1 ? ". " : "... "}`;
        };
        this.getGamePgn = () => {
            // Format headers from the game metadata
            const headers = [
                ["white", this.game.players.white.name],
                ["black", this.game.players.black.name],
                ["Result", this.game.metadata.result || "*"],
                ["Comment", this.game.metadata.comment],
            ]
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => `[${key} "${value}"]`)
                .join("\n");
            // Start from the initial position and export from there
            const initialComment = this.game.initial.comments
                .map((comment) => `{ ${comment} }`)
                .join(" ");
            let pgn = headers + "\n\n" + initialComment + " ";
            // @ts-ignore
            pgn += this.exportNode(this.game.moves);
            // Add the game result at the end if it exists
            if (this.game.metadata.result) {
                pgn += this.game.metadata.result;
            }
            return pgn.trim();
        };
        this.setAutoPlay = (autoplay) => {
            this.autoplay = autoplay;
        };
        this.addComment = (path, comment) => {
            const node = this.nodeAtPathOrNull(path);
            if (node && node.data) {
                if (!node.data.comments) {
                    node.data.comments = [];
                }
                node.data.comments.push(comment);
            }
        };
        this.deleteComment = (path, index) => {
            const node = this.nodeAtPathOrNull(path);
            if (node &&
                node.data &&
                node.data.comments &&
                index < node.data.comments.length) {
                node.data.comments.splice(index, 1);
            }
        };
        this.editComment = (path, index, newComment) => {
            const node = this.nodeAtPathOrNull(path);
            if (node &&
                node.data &&
                node.data.comments &&
                index < node.data.comments.length) {
                node.data.comments[index] = newComment;
            }
        };
        // returns new path
        this.addNode = (node, parentPath) => {
            var _a;
            const newPath = parentPath + (((_a = node.data) === null || _a === void 0 ? void 0 : _a.id) || "");
            const existing = this.nodeAtPathOrNull(newPath);
            if (existing) {
                return newPath;
            }
            const updated = this.updateAt(parentPath, (parent) => parent.children.push(node));
            return updated ? newPath : undefined;
        };
        this.deleteNode = (nodePath) => {
            // Split the path into the parent path and the ID of the current node.
            const parentId = nodePath.slice(0, -2);
            const nodeId = nodePath.slice(-2);
            // Get the parent node.
            const parentNode = this.nodeAtPathOrNull(parentId);
            if (!parentNode)
                return null; // If there is no parent, there is nothing to delete.
            // Find the index of the node to be deleted in the parent's children array.
            const index = parentNode.children.findIndex((child) => { var _a; return ((_a = child.data) === null || _a === void 0 ? void 0 : _a.id) === nodeId; });
            if (index === -1)
                return null; //  Node not found.
            // Remove the node from the list of children.
            parentNode.children.splice(index, 1);
            const mainline = Array.from(this.game.moves.mainline());
            return mainline[mainline.length - 1]; // return the last node before the deleted one
        };
        this.addNodes = (nodes, path) => {
            const node = nodes[0];
            if (!node)
                return path;
            const newPath = this.addNode(node, path);
            return newPath ? this.addNodes(nodes.slice(1), newPath) : undefined;
        };
        this.updateAt = (parentPath, update) => {
            const node = this.nodeAtPathOrNull(parentPath || "");
            if (node) {
                update(node);
                return node;
            }
            return;
        };
        this.nodeAtPathOrNull = (path) => {
            return this.nodeAtPathOrNullFrom(this.game.moves, path);
        };
        this.nodeAtPathOrNullFrom = (node, path) => {
            if (path === "")
                return node;
            const child = childById(node, head(path));
            return child ? this.nodeAtPathOrNullFrom(child, tail(path)) : null;
        };
        this.curNode = () => this.game.nodeAt(this.path) || this.game.moves;
        this.curData = () => this.game.dataAt(this.path) || this.game.initial;
        this.curPly = () => {
            var _a, _b, _c, _d, _e;
            const mainLinePly = (_c = (_b = (_a = this.curNode()) === null || _a === void 0 ? void 0 : _a.children) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.data.ply;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const altLinePly = (((_e = (_d = this.curNode()) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.ply) || 0) + 1;
            return mainLinePly || altLinePly;
        };
        this.isCurrentPathLastOnMainline = () => {
            const lastMove = this.game.moves.end();
            // @ts-ignore
            if (!lastMove.data)
                return true;
            // @ts-ignore
            return this.path.equals(lastMove === null || lastMove === void 0 ? void 0 : lastMove.data.path);
        };
        this.goTo = (to, focus = true) => {
            var _a, _b;
            const path = to == "first"
                ? Path.root
                : to == "prev"
                    ? this.path.init()
                    : to == "next"
                        ? (_b = (_a = this.game.nodeAt(this.path)) === null || _a === void 0 ? void 0 : _a.children[0]) === null || _b === void 0 ? void 0 : _b.data.path
                        : this.game.pathAtMainlinePly("last");
            this.toPath(path || this.path, focus);
        };
        this.isPathOnMainLine = (path) => {
            const mainlinePaths = Array.from(this.game.moves.mainline()).map((m) => m.path.path);
            return mainlinePaths.includes(path);
        };
        this.goToMoveAtFenFromUrl = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const fenFromUrl = urlParams.get("fen");
            if (fenFromUrl) {
                const fenFromUrlDecoded = decodeURIComponent(fenFromUrl);
                const node = this.game.mainline.find((node) => node.fen.startsWith(fenFromUrlDecoded));
                const correspondingPath = node === null || node === void 0 ? void 0 : node.path;
                if (correspondingPath) {
                    this.toPath(correspondingPath);
                }
                else {
                    this.goTo("last");
                }
            }
            else {
                this.goTo("last");
            }
        };
        this.canGoTo = (to) => to == "prev" || to == "first"
            ? !this.path.empty()
            : !!this.curNode().children[0];
        this.toPath = (path, focus = true) => {
            this.path = path;
            this.pane = "board";
            this.autoScrollRequested = true;
            this.redrawGround();
            // this.redraw()
            if (focus)
                this.focus();
        };
        this.focus = () => { var _a; return (_a = this.div) === null || _a === void 0 ? void 0 : _a.focus(); };
        this.toggleMenu = () => {
            this.pane = this.pane == "board" ? "menu" : "board";
            // this.redraw()
        };
        this.togglePgn = () => {
            this.pane = this.pane == "pgn" ? "board" : "pgn";
            // this.redraw()
        };
        this.orientation = () => {
            const base = this.opts.orientation || "white";
            return this.flipped ? opposite(base) : base;
        };
        this.flip = () => {
            this.flipped = !this.flipped;
            this.pane = "board";
            this.redrawGround();
            // this.redraw()
        };
        this.cgState = () => {
            var _a;
            const data = this.curData();
            const lastMove = isMoveData(data)
                ? uciToMove(data.uci)
                : (_a = this.opts.chessground) === null || _a === void 0 ? void 0 : _a.lastMove;
            return {
                fen: data.fen,
                orientation: this.orientation(),
                check: data.check,
                lastMove,
                turnColor: data.turn,
            };
        };
        this.setGround = (cg) => {
            this.ground = cg;
            this.redrawGround();
        };
        this.redrawGround = () => this.withGround((g) => {
            g.set(this.cgState());
            g.setShapes(this.curData().shapes.map((s) => ({
                orig: makeSquare(s.from),
                dest: makeSquare(s.to),
                brush: s.color,
            })));
        });
        this.withGround = (f) => this.ground && f(this.ground);
        this.game = makeGame(opts.pgn, opts.lichess);
        opts.orientation = opts.orientation || this.game.metadata.orientation;
        if (opts.initialPly) {
            this.path = this.game.pathAtMainlinePly(opts.initialPly);
        }
        else {
            this.path = Path.root;
        }
    }
    /**
     * Promotes a variation
     * @param variationPath The path to the variation.
     */
    promoteVariation(variationPath) {
        var _a;
        const lastNodeToAddComment = this.game.moves.end();
        const variationNode = this.nodeAtPathOrNull(variationPath);
        if (!variationNode || !variationNode.data) {
            console.error('Invalid variation path or node not found');
            return;
        }
        // Get the parent node of the variation
        const parentPath = variationPath.slice(0, -2);
        const parentNode = this.nodeAtPathOrNull(parentPath);
        if (!parentNode || !parentNode.children) {
            console.error('Parent node not found or no children exist');
            return;
        }
        // Find the index of the variation node in the parent's children
        const variationIndex = parentNode.children.findIndex((child) => { var _a; return ((_a = child.data) === null || _a === void 0 ? void 0 : _a.id) === variationNode.data.id; });
        if (variationIndex === -1) {
            console.error("Variation node not found in parent's children");
            return;
        }
        // Remove the variation node from its current position
        const [removedNode] = parentNode.children.splice(variationIndex, 1);
        // Insert the removed node at the first position in the parent's children
        parentNode.children.unshift(removedNode);
        // Optionally, adjust the path to point to the new mainline move
        this.path = new Path(parentPath + removedNode.data.id);
        // Update game result
        const mainlineResult = this.game.metadata.result;
        if (mainlineResult) {
            // Add mainline result to the last move of the alternative line
            // @ts-ignore
            if (lastNodeToAddComment && lastNodeToAddComment.data) {
                // @ts-ignore
                const newComments = [...lastNodeToAddComment.data.comments, `Result: ${mainlineResult}`];
                // @ts-ignore
                lastNodeToAddComment.data = {
                    // @ts-ignore
                    ...lastNodeToAddComment.data,
                    comments: newComments,
                };
                this.game.metadata.result = '*';
            }
        }
        // Function to find the last node in a line
        const findLastNode = (node) => {
            while (node.children.length > 0) {
                node = node.children[0];
            }
            return node;
        };
        // Update the game's result to the result of the new mainline
        const newMainlineLastNode = findLastNode(removedNode);
        // @ts-ignore
        const newMainlineResult = (_a = newMainlineLastNode.data) === null || _a === void 0 ? void 0 : _a.comments.find((comment) => {
            return comment.startsWith('Result:');
        });
        if (newMainlineResult) {
            this.game.metadata.result = newMainlineResult.replace('Result: ', '');
        }
        // clear all comments in mainline
        const mainlineNodes = Array.from(this.game.moves.mainline());
        mainlineNodes.forEach((node) => {
            if (node) {
                node.comments = [];
            }
        });
    }
    deleteMovesAfterPath(path) {
        const node = this.nodeAtPathOrNull(path);
        if (node && node.children) {
            node.children = []; // Очистить всех потомков узла
        }
    }
    deleteMoveAndAllFollowing(path) {
        if (path.length < 2) {
            console.error("Invalid path provided");
            return;
        }
        // Получаем родительский путь, удаляя последние 2 символа из текущего пути
        const parentPath = path.substring(0, path.length - 2);
        const nodeId = path.substring(path.length - 2, path.length);
        // Находим родительский узел
        const parentNode = this.nodeAtPathOrNull(parentPath);
        if (!parentNode || !parentNode.children) {
            console.error("Parent node not found or no children exist");
            return;
        }
        // Находим индекс выбранного узла в массиве детей
        const index = parentNode.children.findIndex((child) => { var _a; return ((_a = child.data) === null || _a === void 0 ? void 0 : _a.id) === nodeId; });
        if (index === -1) {
            console.error("Node not found in parent's children");
            return;
        }
        // Удаляем выбранный узел и все следующие узлы
        parentNode.children.splice(index);
    }
    editGameComment(newComment) {
        this.game.metadata.comment = newComment;
    }
    /**
     * Converts a list of NAGs to the standard PGN notation.
     * @param nags Array of NAG numbers.
     * @returns Formatted string with NAGs for PGN.
     */
    formatNags(nags) {
        return nags.map((nag) => `$${nag}`).join(" ");
    }
    /**
     * Recursive function to format a node and its children into PGN notation.
     * @param node The current node in the move tree.
     * @param forcePly Indicates whether to force the ply number at the start of this line.
     * @returns Formatted PGN string for the node and its children.
     */
    exportNode(node, forcePly) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (node.children.length === 0)
            return "";
        let s = "";
        const first = node.children[0];
        if (forcePly || (((_a = first.data) === null || _a === void 0 ? void 0 : _a.ply) || 0) % 2 === 1)
            s += this.plyPrefix(first);
        s += (_b = first.data) === null || _b === void 0 ? void 0 : _b.san;
        // Append NAGs if any
        if ((_d = (_c = first.data) === null || _c === void 0 ? void 0 : _c.nags) === null || _d === void 0 ? void 0 : _d.length) {
            s += ` ${this.formatNags(first.data.nags)}`;
        }
        // Add comments after the move if they exist
        if ((_f = (_e = first.data) === null || _e === void 0 ? void 0 : _e.comments) === null || _f === void 0 ? void 0 : _f.length) {
            first.data.comments.forEach((comment) => {
                s += ` { ${comment} } `;
            });
        }
        for (let i = 1; i < node.children.length; i++) {
            const child = node.children[i];
            // Add move prefix and handle comments before variations
            s += ` (${this.plyPrefix(child)}${child.data.san}${((_g = child.data.nags) === null || _g === void 0 ? void 0 : _g.length) ? ` ${this.formatNags(child.data.nags)}` : ""}${(_h = child.data.comments) === null || _h === void 0 ? void 0 : _h.map((comment) => `{${comment}} `).join("")}`;
            const variation = this.exportNode(child, false);
            if (variation)
                s += " " + variation;
            s += ")";
        }
        const mainline = this.exportNode(first, node.children.length > 1);
        if (mainline)
            s += " " + mainline;
        return s;
    }
}
