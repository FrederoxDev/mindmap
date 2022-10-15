var canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var ctx = canvas.getContext("2d");
ctx.mozImageSmoothingEnabled = true;
ctx.imageSmoothingEnabled = true;

var padding = 10;
let width = canvas.width;
let height = canvas.height;

var menu = document.getElementById("menu");
var mobileErrorMenu = document.getElementById("mobile-error")

var nodeTextInput = document.getElementById("node-text-input");
var addSubNode = document.getElementById("add-sub-node");
var deleteNode = document.getElementById("delete-node");

var openProjectMenu = document.getElementById("open-project")
var openFileButton = document.getElementById("open-file");
var newFileButton = document.getElementById("new-file");
var saveFileButton = document.getElementById("save-file");

var exportPngButton = document.getElementById("export-png");

var nodes = []

let camX = width / 2;
let camY = height / 2;

var mouseDown = false;
var mouseX = 0;
var mouseY = 0;

var hasNodeSelected = false;
var selectedNodeId = "";
var selectNodeIndex = -1;

var scale = 1

var fileHandle = undefined;
var unsavedChanges = true;

var colors = ["#FF6D6A", "#EFBE7D", "#E9EC6B", "#77DD77", "#8BD3E6", "#B1A2CA"]

window.addEventListener("resize", (e) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    width = canvas.width
    height = canvas.height
})

canvas.addEventListener("mousedown", (e) => {
    if (fileHandle == undefined) return
    e.preventDefault();
    mouseDown = true;
    mouseX = e.clientX / scale;
    mouseY = e.clientY / scale;

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
    if (fileHandle == undefined) return
    e.preventDefault();
    mouseDown = false;
}, false)

canvas.addEventListener("mousemove", (e) => {
    if (fileHandle == undefined) return
    if (!mouseDown) return;
    e.preventDefault();

    var deltaX = e.clientX / scale - mouseX;
    var deltaY = e.clientY / scale - mouseY;

    mouseX = e.clientX / scale;
    mouseY = e.clientY / scale;

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

document.addEventListener("wheel", (e) => {
    if (fileHandle == undefined) return
    scale *= 1 + (-e.deltaY / 1000);
    if (scale > 1) scale = 1;
})

document.addEventListener("keydown", async (e) => {
    if (fileHandle == undefined) return

    if (e.key == "Delete" && hasNodeSelected) {
        if (nodes[selectNodeIndex].parent == undefined) return alert("Cannot delete central node!")
        deleteNodeAndChildren(selectedNodeId)
    }

    else if (e.key == "s" && e.ctrlKey) {
        e.preventDefault()
        await saveMindmap()
    }
}, false)

deleteNode.addEventListener("click", (e) => {
    if (nodes[selectNodeIndex].parent == undefined) return alert("Cannot delete central node!")
    deleteNodeAndChildren(selectedNodeId)
})

function deleteNodeAndChildren(nodeUUID) {
    nodes = nodes.filter(node => node.uuid != nodeUUID)

    var children = nodes.filter(node => node.parent == nodeUUID)

    for (child of children) {
        deleteNodeAndChildren(child.uuid)
    }
}

saveFileButton.addEventListener("click", async() => {
    await saveMindmap()
})

nodeTextInput.addEventListener("input", (e) => {
    if (hasNodeSelected) {
        nodes[selectNodeIndex].text = nodeTextInput.value

        if (nodes[selectNodeIndex].parent == undefined) {
            updateWindowTitle()
        }
    }
})

function updateWindowTitle() {
    window.document.title = "Mindmap | " + nodes.find(node => node.parent == undefined).text
}

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

    ctx.resetTransform()
    ctx.clearRect(0, 0, width, height);
    ctx.scale(scale, scale)

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

function getSize(node) {
    var box = ctx.measureText(node.text)
    var width = box.width + 50;
    var height = -box.actualBoundingBoxAscent + -box.actualBoundingBoxDescent - 50;

    return {width, height}
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

async function saveMindmap() {
    try {
        const writeable = await fileHandle.createWritable()
        await writeable.write(JSON.stringify(nodes))
        await writeable.close()
        console.log("Saved!")
    }

    catch (e) {
        console.error(e)
    }
}

draw()

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const getFileHandle = async () => {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [
                {
                    description: "Mindmap file",
                    accept: {
                        "text/mindmap": [".mm"]
                    }
                }
            ]
        })
        return handle
    }

    catch (e) {
        console.error(e)
    }
}

const createFileHandle = async () => {
    try {
        const handle = await window.showSaveFilePicker({
            types: [
                {
                    description: "Mindmap file",
                    accept: {
                        "text/mindmap": [".mm"]
                    }
                }
            ]
        })

        return handle
    }

    catch (e) {
        console.error(e)
        
        if (e.stack == "Error: The user aborted a request.") {
            alert("Creating file cancelled!")
        }

        else {
            alert("Error" + e.stack)
        }
    }
}

openFileButton.addEventListener("click", async () => {
    try {
        if (fileHandle != undefined) await saveMindmap()

        fileHandle = await getFileHandle()

        var fileText = await (await fileHandle.getFile()).text()

        nodes = JSON.parse(fileText)

        updateWindowTitle()
    }
    
    catch (e) {
        console.error(e)

        if (e.stack == "Error: The user aborted a request.") {
            alert("Opening file cancelled!")
        }

        else {
            alert("Error" + e.stack)
        }
    }
})

newFileButton.addEventListener("click", async () => {
    if (fileHandle != undefined) await saveMindmap()

    fileHandle = await createFileHandle()

    nodes = [
        { 
            "type": "text", 
            "text": "New Mindmap", 
            "uuid": crypto.randomUUID(), 
            "x": 0, "y": 0
        }
    ]
})

exportPngButton.addEventListener("click", async () => {
    const handle = await window.showSaveFilePicker({
        types: [
            {
                description: "PNG",
                accept: {
                    "image/png": [".png"]
                }
            }
        ]
    })

    var miX, maX, miY, maY;

    nodes.forEach((node) => {
        var prop = getSize(node)

        if (node.x + prop.width > maX || maX == undefined) maX = node.x + prop.width
        if (node.x - prop.width < miX || miX == undefined) miX = node.x - prop.width
        if (node.y + prop.height < miY || miY == undefined) miY = node.y + prop.height
        if (node.y - prop.height > maY || maY == undefined) maY = node.y - prop.height
    })

    camX = -miX
    camY = -miY

    canvas.width = maX + -miX
    canvas.height = maY + -miY

    scale = 1

    draw()

    canvas.toBlob(async (blob) => {
        const writeable = await handle.createWritable()
        await writeable.write(blob)
        await writeable.close()
    })

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
})

if (!window.chrome) {
    mobileErrorMenu.hidden = false
}