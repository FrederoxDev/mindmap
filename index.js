var canvas = document.getElementById("canvas");
var menu = document.getElementById("menu");
var nodeTextInput = document.getElementById("node-text-input");
var addSubNode = document.getElementById("add-sub-node");

var ctx = canvas.getContext("2d");

var centralUUID = crypto.randomUUID()

var nodes = [
    {
        type: "text",
        text: "Central Node",
        uuid: centralUUID,
        x: 0,
        y: 0
    }
]

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var padding = 10;

let width = canvas.width;
let height = canvas.height;

let camX = width / 2;
let camY = height / 2;

var mouseDown = false;
var mouseX = 0;
var mouseY = 0;

var hasNodeSelected = false;
var selectedNodeId = "";
var selectNodeIndex = -1;

var colors = ["#FF6D6A", "#EFBE7D", "#E9EC6B", "#77DD77", "#8BD3E6", "#B1A2CA"]

canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    mouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;

    for (var i = 0; i < nodes.length; i++) {
        if (isSelected(nodes[i])) {
            hasNodeSelected = true;
            selectedNodeId = nodes[i].uuid;
            selectNodeIndex = i;

            menu.hidden = false
            nodeTextInput.value = nodes[i].text
            break;
        }

        else {
            hasNodeSelected = false;
            selectedNodeId = ""
            selectNodeIndex = -1;
            menu.hidden = true
        }
    }
}, false)

canvas.addEventListener("mouseup", (e) => {
    e.preventDefault();
    mouseDown = false;
}, false)

canvas.addEventListener("mousemove", (e) => {
    if (!mouseDown) return;
    e.preventDefault();

    var deltaX = e.clientX - mouseX;
    var deltaY = e.clientY - mouseY;

    mouseX = e.clientX;
    mouseY = e.clientY;

    // Node Dragging
    if (mouseDown && hasNodeSelected) {
        nodes[selectNodeIndex].x += deltaX;
        nodes[selectNodeIndex].y += deltaY;
    }

    // Camera Dragging
    else {
        camX += deltaX;
        camY += deltaY;
    }
}, false)

document.addEventListener("keydown", (e) => {
    if (e.key == "Delete" && hasNodeSelected) {
        nodes = nodes.filter(node => node.uuid != selectedNodeId)
    }

    else if (e.key == "s" && e.ctrlKey) {
        e.preventDefault()
        console.log(JSON.stringify(nodes))
    }
}, false)

nodeTextInput.addEventListener("input", (e) => {
    if (hasNodeSelected) {
        nodes[selectNodeIndex].text = nodeTextInput.value
    }
})

addSubNode.addEventListener("click", (e) => {
    var uuid = crypto.randomUUID()

    nodes.push({
        type: "text",
        text: "",
        uuid: uuid,
        parent: selectedNodeId,
        x: nodes[selectNodeIndex].x,
        y: nodes[selectNodeIndex].y + 100
    })

    selectedNodeId = uuid;
    selectNodeIndex = nodes.length - 1
    nodeTextInput.value = nodes[selectNodeIndex].text
})

function draw() {
    window.requestAnimationFrame(draw);
    ctx.clearRect(0, 0, width, height);

    for (var i = 0; i < nodes.length; i++) {
        drawLines(nodes[i])
    }

    for (var i = 0; i < nodes.length; i++) {
        drawNode(nodes[i])
    }
}

function drawNode(node) {
    if (node.type == "text") {
        ctx.font = "30px Segoe UI";

        var box = ctx.measureText(node.text)
        var width = box.width;
        var height = -box.actualBoundingBoxAscent + -box.actualBoundingBoxDescent;

        if (node.uuid == selectedNodeId) {
            ctx.beginPath();
            ctx.strokeStyle = "rgb(51 65 85)";
            ctx.lineWidth = 4;
            ctx.roundRect(node.x + camX - padding, node.y + camY + padding, width + padding * 2, height - padding * 2, 5);
            ctx.stroke()
        }

        ctx.beginPath();
        ctx.fillStyle = colors[getDepth(node)];
        ctx.roundRect(node.x + camX - padding, node.y + camY + padding, width + padding * 2, height - padding * 2, 5);  
        ctx.fill()

        ctx.fillStyle = "black";
        ctx.fillText(node.text, node.x + camX, node.y + camY);
    }
}

function drawLines(node) {
    if (node.type == "text" && node.parent != undefined) {
        ctx.beginPath()

        var point = getTextMidpoint(node)
        ctx.moveTo(point.x, point.y)

        var otherNode = nodes[nodes.findIndex(otherNode => otherNode.uuid == node.parent)]
        var otherPoint = getTextMidpoint(otherNode)

        ctx.lineTo(otherPoint.x, otherPoint.y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors[getDepth(otherNode)];
        ctx.stroke()
    }
}

function getTextMidpoint(node) {
    if (node.type == "text") {
        var x1 = node.x + camX;
        var y2 = node.y + camY;

        var box = ctx.measureText(node.text);
        var x2 = box.width + x1;
        var y1 = y2 - (box.actualBoundingBoxAscent + box.actualBoundingBoxDescent);

        return {
            x: (x2 + x1) / 2,
            y: (y2 + y1) / 2
        }
    }
}

function isSelected(node) {
    if (node.type == "text") {
        var x1 = node.x + camX - padding;
        var y2 = node.y + camY + padding;

        var box = ctx.measureText(node.text);
        var x2 = box.width + x1 + padding * 2;
        var y1 = y2 - (box.actualBoundingBoxAscent + box.actualBoundingBoxDescent) - padding * 2;

        if (mouseX > x1 && mouseX < x2 && mouseY > y1 && mouseY < y2) return true;
        else return false;
    }
}

function getDepth(node) {
    var depth = 0;

    while (true) {
        if (!node.parent) return depth;

        node = nodes[nodes.findIndex(otherNode => otherNode.uuid == node.parent)]
        depth++;
    }
}

draw()