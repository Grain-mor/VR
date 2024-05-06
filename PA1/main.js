'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let sphereSurface;              // A model to vizualize local light
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let startTime = Date.now();
let spherePosition = { u: 0.5, t: 0.5 };
let strCam;
let uil;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals, texCoords) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoord);


        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    this.iNormalMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    // let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    let border = 10
    let projection = m4.orthographic(-border, border, -border, border, -border, border)

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -7);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);
    const normalMatrix = m4.identity();
    m4.inverse(modelView, normalMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, modelViewProjection);
    gl.uniform1f(shProgram.iTime, (Date.now() - startTime) * 0.001);
    gl.uniform1f(shProgram.iAngle, parseFloat(document.getElementById('angle').value));
    gl.uniform2f(shProgram.iSpherePosition, mapRange(spherePosition.u, 0, Math.PI * 2, 0, 1), mapRange(spherePosition.t, -1, 1, 0, 1));

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    gl.uniform1i(shProgram.iLight, false);
    strCam.ApplyLeftFrustum();
    gl.colorMask(true, false, false, false);
    modelViewProjection = m4.multiply(strCam.ProjectionMatrix, m4.multiply(strCam.ModelViewMatrix, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    strCam.ApplyRightFrustum();
    gl.colorMask(false, true, true, false);
    modelViewProjection = m4.multiply(strCam.ProjectionMatrix, m4.multiply(strCam.ModelViewMatrix, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    surface.Draw();
    gl.colorMask(true, true, true, true);
}

function repeatDraw() {
    draw()
    window.requestAnimationFrame(repeatDraw)
}

function mapRange(value, a, b, c, d) {
    // first map value from (a..b) to (0..1)
    value = (value - a) / (b - a);
    // then map it from (0..1) to (c..d) and return it
    return c + value * (d - c);
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let texCoordList = [];

    let u = 0,
        t = -1;
    while (u < Math.PI * 2) {
        while (t < 1) {
            let v = getVertex(u, t);
            let w = getVertex(u + 0.1, t);
            let wv = getVertex(u, t + 0.1);
            let ww = getVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            normalList.push(...computeFacetAverage(u, t))
            texCoordList.push(mapRange(u, 0, Math.PI * 2, 0, 1), mapRange(t, -1, 1, 0, 1))
            vertexList.push(w.x, w.y, w.z);
            normalList.push(...computeFacetAverage(u + 0.1, t))
            texCoordList.push(mapRange(u + 0.1, 0, Math.PI * 2, 0, 1), mapRange(t, -1, 1, 0, 1))
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(...computeFacetAverage(u, t + 0.1))
            texCoordList.push(mapRange(u, 0, Math.PI * 2, 0, 1), mapRange(t + 0.1, -1, 1, 0, 1))
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(...computeFacetAverage(u, t + 0.1))
            texCoordList.push(mapRange(u, 0, Math.PI * 2, 0, 1), mapRange(t + 0.1, -1, 1, 0, 1))
            vertexList.push(w.x, w.y, w.z);
            normalList.push(...computeFacetAverage(u + 0.1, t))
            texCoordList.push(mapRange(u + 0.1, 0, Math.PI * 2, 0, 1), mapRange(t, -1, 1, 0, 1))
            vertexList.push(ww.x, ww.y, ww.z);
            normalList.push(...computeFacetAverage(u + 0.1, t + 0.1))
            texCoordList.push(mapRange(u + 0.1, 0, Math.PI * 2, 0, 1), mapRange(t + 0.1, -1, 1, 0, 1))
            t += 0.1;
        }
        t = -1;
        u += 0.1;
    }

    return {
        v: vertexList,
        n: normalList,
        tex: texCoordList,
    };
}

const a = 0.8,
    c = 2,
    theta = 0.2 * Math.PI

function getVertex(u, t) {
    let x = getX(u, t)
    let y = getY(u, t)
    let z = getZ(u, t)
    return { x: x, y: y, z: z }
}

function getX(u, t) {
    let x = (a + t * Math.cos(theta) + c * Math.pow(t, 2) * Math.sin(theta)) * Math.cos(u);
    return x;
}

function getY(u, t) {
    let y = (a + t * Math.cos(theta) + c * Math.pow(t, 2) * Math.sin(theta)) * Math.sin(u);
    return y;
}

function getZ(u, t) {
    let z = -t * Math.sin(theta) + c * Math.pow(t, 2) * Math.cos(theta)
    return z;
}

function CreateSphereData() {
    let vertexList = [];
    let normalList = [];

    let u = 0,
        t = 0;
    while (u < Math.PI * 2) {
        while (t < Math.PI) {
            let v = getSphereVertex(u, t);
            let w = getSphereVertex(u + 0.1, t);
            let wv = getSphereVertex(u, t + 0.1);
            let ww = getSphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            normalList.push(v.x, v.y, v.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(ww.x, ww.y, ww.z);
            normalList.push(ww.x, ww.y, ww.z);
            t += 0.1;
        }
        t = 0;
        u += 0.1;
    }
    return {
        v: vertexList,
        n: normalList
    };
}
const r = 0.2;
function getSphereVertex(long, lat) {
    return {
        x: r * Math.cos(long) * Math.sin(lat),
        y: r * Math.sin(long) * Math.sin(lat),
        z: r * Math.cos(lat)
    }
}

function computeFacetAverage(u, t) {
    let v0 = getVertex(u, t);
    let v1 = getVertex(u + 0.1, t);
    let v2 = getVertex(u, t + 0.1);
    let v3 = getVertex(u - 0.1, t + 0.1);
    let v4 = getVertex(u - 0.1, t);
    let v5 = getVertex(u - 0.1, t - 0.1);
    let v6 = getVertex(u, t - 0.1);
    let v01 = m4.subtractVectors(Object.values(v1), Object.values(v0))
    let v02 = m4.subtractVectors(Object.values(v2), Object.values(v0))
    let v03 = m4.subtractVectors(Object.values(v3), Object.values(v0))
    let v04 = m4.subtractVectors(Object.values(v4), Object.values(v0))
    let v05 = m4.subtractVectors(Object.values(v5), Object.values(v0))
    let v06 = m4.subtractVectors(Object.values(v6), Object.values(v0))
    let n1 = m4.normalize(m4.cross(v01, v02))
    let n2 = m4.normalize(m4.cross(v02, v03))
    let n3 = m4.normalize(m4.cross(v03, v04))
    let n4 = m4.normalize(m4.cross(v04, v05))
    let n5 = m4.normalize(m4.cross(v05, v06))
    let n6 = m4.normalize(m4.cross(v06, v01))
    let n = [(n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
    (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
    (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0]
    n = m4.normalize(n);
    return n;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "texCoord");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iTime = gl.getUniformLocation(prog, "t");
    shProgram.iLight = gl.getUniformLocation(prog, "light");
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');
    shProgram.iAngle = gl.getUniformLocation(prog, 'angle');
    shProgram.iSpherePosition = gl.getUniformLocation(prog, 'spherePosition');
    LoadTexture();

    strCam = new StereoCamera(10, 1, 1, 60, 1, 10);
    uil = new UIL.Gui({ w: 300 })
    uil.add(strCam, 'Convergence', { type: 'slide', min: 10, max: 100, step: 1 })
    uil.add(strCam, 'EyeSeparation', { type: 'slide', min: 0, max: 2, step: 0.01 })
    uil.add(strCam, 'FOV', { type: 'slide', min: 0.1, max: 2.8, step: 0.1 })
    uil.add(strCam, 'NearClippingDistance', { type: 'slide', min: 1, max: 8, step: 0.01 })

    surface = new Model('Surface');
    let surfaceData = CreateSurfaceData()
    surface.BufferData(surfaceData.v, surfaceData.n, surfaceData.tex);
    sphereSurface = new Model('Sphere');
    let sphereData = CreateSphereData()
    sphereSurface.BufferData(sphereData.v, sphereData.n, sphereData.n);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    repeatDraw();
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/Grain-mor/vggi/CGW-img/CGW-img/Pattern.png";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}