//get board template from html to work on
var boardGenerate = document.getElementById("board");
var currentcolor = false;
var rowWorkingOn;
var square;
var whiteValues = [1, 3, 4, 5, 9, 10];
var whitePieces = [
    "https://upload.wikimedia.org/wikipedia/commons/3/37/Western_white_side_Pawn.svg",
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/Western_white_side_Knight.svg",
    "https://upload.wikimedia.org/wikipedia/commons/a/ad/Western_white_side_Bishop.svg",
    "https://upload.wikimedia.org/wikipedia/commons/e/ed/Western_white_side_Rook.svg",
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Western_white_side_Queen.svg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3b/Western_white_side_King.svg"
]
var blackValues = [-1, -3, -4, -5, -9, -10];
var blackPieces = [
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/Western_black_side_Pawn_%281%29.svg",
    "https://upload.wikimedia.org/wikipedia/commons/2/21/Western_black_side_Knight.svg",
    "https://upload.wikimedia.org/wikipedia/commons/c/cf/Western_black_side_Bishop.svg",
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Western_black_side_Rook.svg",
    "https://upload.wikimedia.org/wikipedia/commons/4/40/Western_black_side_Queen.svg",
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/Western_black_side_King.svg"
]

var knightPattern = [[-2, 1], [-2, -1], [-1, 2], [1, 2], [2, -1], [2, 1], [-1, -2], [1, -2]];
var kingPattern = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
var pawnLRCap = [-1, 1];

var boardSimpleView = [
    [-5, -3, -4, -9, -10, -4, -3, -5],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [5, 3, 4, 9, 10, 4, 3, 5]
];

var ai = {
    board: boardSimpleView,
    resulting: boardSimpleView,
    tree: []
}
var bestMove = [];

var movingPiece = {
    x: null,
    y: null,
    image: null,
};
var whiteCastle = {
    l: true,
    k: true,
    r: true,
    tl:true,
    tr:true,
    check:false
};
var blackCastle = {
    l: true,
    k: true,
    r: true,
    tl:true,
    tr:true,
    check:false
};

var performMove = {
    color: 1
};
var mathCalculations = {
    boardSum: 0
}
//make it so that the board can be regenerated based on the information given, especially if pieces move
function setupBoard() {
    for (var columnCounter = 0; columnCounter < 8; columnCounter++) {
        rowWorkingOn = document.createElement('tr');
        boardGenerate.appendChild(rowWorkingOn);
        for (var rowCounter = 0; rowCounter < 8; rowCounter++) {
            square = document.createElement("td");
            square.id = rowCounter + "_" + columnCounter;
            //instantly state that clicking on these locations would trigger the finction to move pieces
            square.onclick = function () { selectSquare(this.id) };

            switch (currentcolor) {
                case true:
                    square.style.backgroundColor = "#fccc74";
                    break;
                case false:
                    square.style.backgroundColor = "#eeeed2";
                    break;
            }
            currentcolor = !currentcolor;
            rowWorkingOn.appendChild(square);

            //put on pieces by searching
            for (let placePiece = 0; placePiece < 6; placePiece++) {
                if (boardSimpleView[columnCounter][rowCounter] == whiteValues[placePiece]) {
                    square.innerHTML += "<img src=" + whitePieces[placePiece] + ">";
                    continue;
                }
                if (boardSimpleView[columnCounter][rowCounter] == blackValues[placePiece]) {
                    square.innerHTML += "<img src=" + blackPieces[placePiece] + ">";
                    continue;
                }
            }
        }
        currentcolor = !currentcolor;
    }
}
var totalMoves = [];
//pawn exception due to attacking vs moving
var totalMovesExclusions = [];
var clickX;
var clickY;

var moveCounter = 1;
var gameTree = [];
//var moveSound  = new Audio("")

var squaredAttackedbyW = [];
var squaredAttackedbyB = [];

var allAIMoves = [];
var allCounterMoves = [];
//eval tracker
var evaluation = 0;

function selectSquare(coordinate){
    //try to validate the left right behaviour of where the rooks are
    blackCastle.l = blackCastle.r = whiteCastle.l = whiteCastle.r = true;
    //checkCastle();
    //clean up board 
    clearHighlight();
    //add in auto check
    clickX = Number(coordinate.substring(0, 1));
    clickY = Number(coordinate.substring(2, 3));
    //when either kings are attacked
    if(blackCastle.check == true||whiteCastle.check == true){
        checkCheck();
        resolveCheck();
    }
    //empty selection
    else if (movingPiece.x == null && boardSimpleView[clickY][clickX] != 0 && performMove.color * boardSimpleView[clickY][clickX] > 0) {
                        //once simulated board updated, then redo search
                        getAttackingSquare();
        getStartingPiece(clickX, clickY);
    }
//selects to move another piece (check in case the code doesnt make the pieces cancel out)
        else if (movingPiece.x != null && boardSimpleView[movingPiece.y][movingPiece.x] * boardSimpleView[clickY][clickX] > 0) {
            clearHighlight();
            totalMoves = [];
            totalMovesExclusions = [];
            getStartingPiece(clickX, clickY);
        }
    //"second" selection to a valid moving spot......
    else if (movingPiece.x != null && boardSimpleView[movingPiece.y][movingPiece.x] * boardSimpleView[clickY][clickX] <= 0) {
        //what happens if you clicked ***to move*** a piece
        for (let i = 0; i < totalMoves.length; i++) {
            if (clickX == totalMoves[i][0] && clickY == totalMoves[i][1]) {
                //what happens on the simulated board
                boardSimpleView[clickY][clickX] = boardSimpleView[movingPiece.y][movingPiece.x]
                boardSimpleView[movingPiece.y][movingPiece.x] = 0;
                
                //what happens on the physical board
                //clear old slot and place at new slot
                document.getElementById(clickX + "_" + clickY).innerHTML = movingPiece.image
                document.getElementById(movingPiece.x + "_" + movingPiece.y).innerHTML = "";
                //remove traces
                movingPiece.x = null;
                movingPiece.y = null;
                //get board sum for reference
                mathCalculations.boardSum = getBoardTotal(boardSimpleView);        
                //clear up moves
                totalMoves = [];
                totalMovesExclusions = [];
                //clear green highlight
                clearHighlight();
                //switch whose turn it is
                performMove.color *= -1;
                //if playing against computer(doesnt work yet)
                console.log(boardSimpleView);

                break;
            }
        }
        /*
        if(performMove.color<0){
            findBestAIMove();
            console.log(performMove.color)
        }
        */
    }
}
function aiGetMoves(x, y, board) {
    switch (board[y][x]) {
        //rook t shaped move
        case 5:
        case -5:
            moveT(x, y);
            break;
        //bishop x shaped move
        case 4:
        case -4:
            moveX(x, y);
            break;
        //knight L shaped move
        case 3:
        case -3:
            moveL(x, y);
            break;
        //queen's x and t shaped move
        case 9:
        case -9:
            moveT(x, y);
            moveX(x, y);
            break;
        //king
        case 10:
        case -10:
            moveK(x, y)
            break;
        //pawn
        case 1:
        case -1:
            moveP(x, y)
            break;
    }
}
//done
function moveT(x, y) {
    //left
    for (let xPos = x - 1; xPos > -1; xPos--) {
        if (boardSimpleView[y][xPos] === 0) {
            totalMoves.push([xPos, y]);
        }
        else if (boardSimpleView[y][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, y]);
            break;
        }
    }
    //up
    for (let yPos = y - 1; yPos > -1; yPos--) {
        if (boardSimpleView[yPos][x] == 0) {
            totalMoves.push([x, yPos]);
        }
        else if (boardSimpleView[yPos][x] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([x, yPos]);
            break;
        }
    }
    //right
    for (let xPos = x + 1; xPos < 8; xPos++) {
        if (boardSimpleView[y][xPos] == 0) {
            totalMoves.push([xPos, y]);
        }
        else if (boardSimpleView[y][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, y]);
            break;
        }
    }

    //down
    for (let yPos = y + 1; yPos < 8; yPos++) {
        if (boardSimpleView[yPos][x] == 0) {
            totalMoves.push([x, yPos]);
        }
        else if (boardSimpleView[yPos][x] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([x, yPos]);
            break;
        }
    }
}
//done
function moveX(x, y) {
    //top left
    for (let xPos = x - 1, yPos = y - 1; xPos > -1 && yPos > -1; xPos--, yPos--) {
        if (boardSimpleView[yPos][xPos] == 0) {
            totalMoves.push([xPos, yPos]);
        }
        else if (boardSimpleView[yPos][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, yPos]);
            break;
        }
    }

    //top right
    for (let xPos = x + 1, yPos = y - 1; xPos < 8 && yPos > -1; xPos++, yPos--) {
        if (boardSimpleView[yPos][xPos] == 0) {
            totalMoves.push([xPos, yPos]);
        }
        else if (boardSimpleView[yPos][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, yPos]);
            break;
        }
    }
    //btm left
    for (let xPos = x - 1, yPos = y + 1; xPos > -1 && yPos < 8; xPos--, yPos++) {
        if (boardSimpleView[yPos][xPos] == 0) {
            totalMoves.push([xPos, yPos]);
        }
        else if (boardSimpleView[yPos][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, yPos]);
            break;
        }
    }
    //btm right
    for (let xPos = x + 1, yPos = y + 1; xPos < 8 && yPos < 8; xPos++, yPos++) {
        if (boardSimpleView[yPos][xPos] == 0) {
            totalMoves.push([xPos, yPos]);
        }
        else if (boardSimpleView[yPos][xPos] * boardSimpleView[y][x] > 0) {
            break;
        }
        else {
            totalMoves.push([xPos, yPos]);
            break;
        }
    }
}
//done
function moveL(x, y) {
    for (let i = 0; i < knightPattern.length; i++) {
        if (y + knightPattern[i][1] > -1 && y + knightPattern[i][1] < 8 && x + knightPattern[i][0] > -1 && x + knightPattern[i][0] < 8) {
            if (boardSimpleView[y + knightPattern[i][1]][x + knightPattern[i][0]] == 0 || (boardSimpleView[y + knightPattern[i][1]][x + knightPattern[i][0]] * boardSimpleView[y][x] < 0)) {
                totalMoves.push([x + knightPattern[i][0], y + knightPattern[i][1]]);
                continue;
            }
        }
    }
}
function moveK(x, y) {
    for (let i = 0; i < kingPattern.length; i++) {
        if (y + kingPattern[i][1] > -1 && y + kingPattern[i][1] < 8 && x + kingPattern[i][0] > -1 && x + kingPattern[i][0] < 8) {
            if (boardSimpleView[y + kingPattern[i][1]][x + kingPattern[i][0]] == 0 || (boardSimpleView[y + kingPattern[i][1]][x + kingPattern[i][0]] * boardSimpleView[y][x] < 0)) {
                totalMoves.push([x + kingPattern[i][0], y + kingPattern[i][1]]);
                continue;
            }
        }
    }
    /*
    //assuming black's turn
    if(performMove.color<0&&blackCastle.k == true&&blackCastle.check == false){
        if(blackCastle.l == true){
            totalMoves.push([6, 0])//whatever moves there are
        }
        if(blackCastle.r == true){
            totalMoves.push([2, 0])//whatever moves there are
        }
    }
    //white castle
    if(performMove.color>0&&whiteCastle.k == true&&whiteCastle.check == false){
        if(whiteCastle.l == true){
            totalMoves.push([2, 7])//whatever moves there are
        }
        if(whiteCastle.r == true){
            totalMoves.push([6, 7])//whatever moves there are
        }
    }
    */

}
function moveP(x, y) {
    if (boardSimpleView[y][x] < 0) {
        //at starting position
        if (y < 7 && boardSimpleView[y + 1][x] == 0) {
            //black
            totalMoves.push([x, y + 1]);
            if (y == 1 && boardSimpleView[y + 2][x] == 0) {
                totalMoves.push([x, y + 2]);
            }
        }
        //capture
        for (let i = 0; i < pawnLRCap.length; i++) {
            if(y<7&&x>0&&x<7){
            if (boardSimpleView[y + 1][x + pawnLRCap[i]] > 0) {
                totalMoves.push([(x + pawnLRCap[i]), y + 1]);
            }
            totalMovesExclusions.push([(x + pawnLRCap[i]), y + 1]);
            continue;
        }
        }
    }

    if (boardSimpleView[y][x] > 0) {
        //at start
        if (y > 0 && boardSimpleView[y - 1][x] == 0) {
            //white
            totalMoves.push([x, y - 1]);
            if (y == 6 && boardSimpleView[y - 2][x] == 0) {
                totalMoves.push([x, y - 2]);
            }
        }
        //captures
        for (let i = 0; i < pawnLRCap.length; i++) {
            if(y>0&&x>0&&x<7){
            if (boardSimpleView[y - 1][x + pawnLRCap[i]] < 0) {
                totalMoves.push([(x + pawnLRCap[i]), y - 1]);
            }
            totalMovesExclusions.push([(x + pawnLRCap[i]), y - 1]);
            continue;
        }
        }
    }
}
//done
function possibleMove() {
    for (let i = 0; i < totalMoves.length; i++) {
        document.getElementById(totalMoves[i][0] + "_" + totalMoves[i][1]).style.backgroundColor = "#98FB98";
    }
}
//done
function clearHighlight() {
    var refill = true;
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            switch (refill) {
                case true:
                    document.getElementById(x + "_" + y).style.backgroundColor = "#eeeed2";
                    break;
                case false:
                    document.getElementById(x + "_" + y).style.backgroundColor = "#fccc74";
                    break;
            }
            refill = !refill;
        }
        refill = !refill;
    }
}
//done 
function getStartingPiece(clickX, clickY) {
    movingPiece.x = clickX;
    movingPiece.y = clickY;
    movingPiece.image = document.getElementById(movingPiece.x + "_" + movingPiece.y).innerHTML;
    switch (boardSimpleView[movingPiece.y][movingPiece.x]) {
        //rook t shaped move
        case 5:
        case -5:
            moveT(movingPiece.x, movingPiece.y);
            break;
        //bishop x shaped move
        case 4:
        case -4:
            moveX(movingPiece.x, movingPiece.y);
            break;
        //knight L shaped move
        case 3:
        case -3:
            moveL(movingPiece.x, movingPiece.y);
            break;
        //queen's x and t shaped move
        case 9:
        case -9:
            moveT(movingPiece.x, movingPiece.y);
            moveX(movingPiece.x, movingPiece.y);
            break;
        //king
        case 10:
        case -10:
            moveK(movingPiece.x, movingPiece.y)
            break;
        //pawn
        case 1:
        case -1:
            moveP(movingPiece.x, movingPiece.y)
            break;
    }
    possibleMove();

}
function getAttackingSquare() {
    //reset the general list of things that are being attacked
        if (moveCounter % 2 != 0){
            squaredAttackedbyB = [];
        }
        else {
            squaredAttackedbyW = [];
        }
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            if (boardSimpleView[y][x] * performMove.color < 0) {
                aiGetMoves(x, y, boardSimpleView);
                sortAttackingSquare(x, y);
            }
        }
    }
    moveCounter++;
    checkCheck();
}
function sortAttackingSquare(x, y) {
    //sort squares given the current turn
    if (Math.abs(boardSimpleView[y][x]) == 1) {
        if (performMove.color == -1) {
            squaredAttackedbyW.push(totalMovesExclusions);
        }
        else {
            squaredAttackedbyB.push(totalMovesExclusions);
        }
    }
    else {
        if (performMove.color == -1) {
            squaredAttackedbyW.push(totalMoves);
        }
        else {
            squaredAttackedbyB.push(totalMoves);
        }
    }
    totalMoves = [];
    totalMovesExclusions = [];
}
function checkCheck(){
    for(let y = 0; y<8; y++){
        for(let x = 0; x<8; x++){
            if(boardSimpleView[y][x]=== 10){
                //see if white king is checked
                for(let i = 0; i<squaredAttackedbyB.length; i++){
                    for(let j = 0; j<squaredAttackedbyB[i].length; j++){
                    if(x === squaredAttackedbyB[i][j][0]&&y === squaredAttackedbyB[i][j][1]){
                        whiteCastle.check = true;
                        document.getElementById(x + "_" + y).style.backgroundColor = "#fb9898";
                    }
                }
            }
            }
            else if(boardSimpleView[y][x]=== -10){
                for(let i = 0; i<squaredAttackedbyW.length; i++){
                    for(let j = 0; j<squaredAttackedbyW[i].length; j++){
                    if(x === squaredAttackedbyW[i][j][0]&&y === squaredAttackedbyW[i][j][1]){
                        blackCastle.check = true;
                        document.getElementById(x + "_" + y).style.backgroundColor = "#fb9898";
                    }
                }
            }
            }
        }
    }
}
//need to optimize recursive search.

//get overall sum of board
function getBoardTotal(board) {
    var total = 0;
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            total += board[y][x];
        }
    }
    return total;
}
function findBestAIMove(){
    var start = new Date();
    // CODE
    getAllBlackMoves(boardSimpleView);

    let layer = allAIMoves;
    let bestScore = 1000;
    let bestMove = [];
    //all the black pieces(location)
    for (let i = 0; i< layer.length; i += 2){
        //use the trailing index to access the possible moves of the piece
        //find length of following index(where the possible moves are)
        for (let j = 0; j < layer[i + 1].length; j++) {
            evaluation++;
            //use the resulting to find the board total value; temporarily store these values in an array
            //originally empty ----------------------------------> originally filled
            boardSimpleView[layer[i + 1][j][1]][layer[i + 1][j][0]] = boardSimpleView[layer[i][1]][layer[i][0]];
            //replace
            boardSimpleView[layer[i][1]][layer[i][0]] = 0;
            let score = miniMax(boardSimpleView, 5, true);
            boardSimpleView[layer[i][1]][layer[i][0]] = boardSimpleView[layer[i + 1][j][1]][layer[i + 1][j][0]];
            boardSimpleView[layer[i + 1][j][1]][layer[i + 1][j][0]] = 0;
            if(score<bestScore){
                bestScore = score;
                bestMove = [[layer[i][0],layer[i][1]], [layer[i + 1][j][0],layer[i + 1][j][1]]];
            }
        }
    }

    console.log(bestMove[0][0]+"_"+bestMove[0][1]+" to "+ bestMove[1][0]+"_"+bestMove[1][1]);
    //********************** where the moving happens***************** 
    selectSquare(bestMove[0][0]+"_"+bestMove[0][1]);
    selectSquare(bestMove[1][0]+"_"+bestMove[1][1]);
    /*
    var time = new Date() - start;
    console.log(boardSimpleView);
    console.log(ai.board);
    console.log("it took: "+time/1000+"s");
    console.log("made "+evaluation+" evaluations");
    */
}

function miniMax(board, depth, isMaximizing){

    if(depth == 0){
        return getBoardTotal(board);
    }
   if(isMaximizing === true){
    getAllCounterMoves(board);
    let layer = allCounterMoves;
    let bestScore = -100;

    for (let i = 0; i < layer.length; i += 2){
        //use the trailing index to access the possible moves of the piece
        for (let j = 0; j < layer[i + 1].length; j++) {
            evaluation++;
            //use the resulting to find the board total value; temporarily store these values in an array
            //original blank --------------------------> original filled
            board[layer[i + 1][j][1]][layer[i + 1][j][0]] = board[layer[i][1]][layer[i][0]];

            board[layer[i][1]][layer[i][0]] = 0;

            let score = miniMax(board, depth-1, false);
            board[layer[i][1]][layer[i][0]] = board[layer[i + 1][j][1]][layer[i + 1][j][0]];
            board[layer[i + 1][j][1]][layer[i + 1][j][0]] = 0;

            bestScore = Number(Math.max(score, bestScore));
        }
    }
    return bestScore;
}
else{
    getAllBlackMoves(board);
    let layer = allAIMoves;
    let bestScore = 100;

    for (let i = 0; i < layer.length; i += 2){
        //use the trailing index to access the possible moves of the piece
        for (let j = 0; j < layer[i + 1].length; j++) {
            //use the resulting to find the board total value; temporarily store these values in an array
            board[layer[i + 1][j][1]][layer[i + 1][j][0]] = board[layer[i][1]][layer[i][0]];

            board[layer[i][1]][layer[i][0]] = 0;

            let score = miniMax(board, depth-1, true);

            board[layer[i][1]][layer[i][0]] = board[layer[i + 1][j][1]][layer[i + 1][j][0]];
            board[layer[i + 1][j][1]][layer[i + 1][j][0]] = 0;

            bestScore = Number(Math.min(score, bestScore));
        }
    }
    return bestScore;
}
}
function getAllBlackMoves(currentDepth) {
    allAIMoves = [];
    for (let x = 0; x <8; x++) {
        for (let y = 0; y <8; y++){
            if (currentDepth[y][x] < 0) {
                aiGetMoves(x, y, currentDepth);
                //triggers totalmove search
                if (totalMoves.length > 0) {
                    allAIMoves.push([x, y], totalMoves);
                    totalMoves = [];
                }
            }
        }
    }
}
function getAllCounterMoves(currentDepth){
    allCounterMoves = [];
    for (let x = 0; x <= 7; x++) {
        for (let y = 0; y <= 7; y++) {
            if (currentDepth[y][x] > 0) {
                aiGetMoves(x, y, currentDepth);
                if (totalMoves.length > 0) {
                    allCounterMoves.push([x, y], totalMoves);
                    totalMoves = [];
                }
            }
        }
    }
}

/*function greatestVal(arr){
    var ret = [];
    var max = 0;
    var index = 0;
    var i = 0;
    for(; i<arr.length; i++){
        if(Math.abs(max)<Math.abs(arr[i])){
            max = arr[i];
            index = i;
        }
    }
    ret.push(max);
    ret.push(index);
    return ret;
}
*/
function resolveCheck(){
    //adding in colored tiles, complete by May 3rd
    for(let y = 0; y<7; y++){
        for(let x = 0; x<7; x++){
            continue;
        }
    }
}
function checkCastle(){
    whiteCastle.tr = whiteCastle.tl = blackCastle.tr = blackCastle.tl = true;
        //validate check characteristics
        for(let i = 0; i<8; i++){
            for(let j = 0; j<8; j++){
                //if(boardSimpleView[j])
                //if black king is found
                if(boardSimpleView[j][i] == -10){
                    if(i!=4||j!=0){
                        //if king is out of place no way to castle
                        blackCastle.l = blackCastle.r = blackCastle.k = false;
                    }
                    if(boardSimpleView[0][1] !=0 ||boardSimpleView[0][2] !=0||boardSimpleView[0][3] !=0){
                        //left side blocked
                        blackCastle.tl = false;
                    }
                    if(boardSimpleView[0][5] !=0 ||boardSimpleView[0][6] !=0){
                        //right side blocked
                        blackCastle.tr = false;
                    }
                }
                //white king is found
                if(boardSimpleView[j][i] == 10){
                    if(i!=4||j!=7){
                        whiteCastle.l = whiteCastle.k = whiteCastle.r = false;
      
                    }
                    if(boardSimpleView[7][1] !=0 ||boardSimpleView[7][2] !=0||boardSimpleView[7][3] !=0){
                        whiteCastle.tl = false;
                    }
                    if(boardSimpleView[7][5] !=0 ||boardSimpleView[7][6] !=0){
                        whiteCastle.tr = false;
                    }
                }
            }
        }
}
setupBoard();
