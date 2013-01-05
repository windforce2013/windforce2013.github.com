/*
	Pandora Collada Viewer
	Windforce
	
	PandoraEngine
	Perform the WEBGL animation from model data.
*/
function getShader(gl, id) {
	var shaderScript = "";
	var shader;
		
	if (id == "shader-vs") {
		shaderScript = VERTEX_SHADER_SCRIPT;
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else if (id = "shader-fs") {
		shaderScript = FRAGMENT_SHADER_SCRIPT;
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else {
		return null;
	}
		
	gl.shaderSource(shader, shaderScript);
	gl.compileShader(shader);
		
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}

function log(msg) {
	if (window.console && window.console.log) {
		console.log(msg);
	}
}

function handleContextLost(e) {
	log("Context Lost");
	e.preventDefault();
}

function handleContextRestored() {
	log("Context Restored");
	init();
}

var shaders = { };
var sf = null;
var canvas;
var gl;
var addedHandlers = false;
var texturesBound = false;

function setup() {
	canvas = document.getElementById("canvas");
	
	canvas.addEventListener('webglcontextlost', handleContextLost, false);
	canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
	
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) {
		return;
	}

	init();
}

function init() {
	canvas.removeEventListener("mousedown", mouseDownHandler, false);
	canvas.removeEventListener("mousemove", mouseMoveHandler, false);
	canvas.removeEventListener("mouseup", mouseUpHandler, false);
	
	gl.viewport(0, 0, VIEW_PORT_WIDTH, VIEW_PORT_HEIGHT);

	shaders = {};
	shaders.fs = getShader(gl, "shader-fs");
	shaders.vs = getShader(gl, "shader-vs");
	
	shaders.sp = gl.createProgram();
	gl.attachShader(shaders.sp, shaders.vs);
	gl.attachShader(shaders.sp, shaders.fs);
	gl.linkProgram(shaders.sp);
	
	if (!gl.getProgramParameter(shaders.sp, gl.LINK_STATUS) && !gl.isContextLost()) {
		alert(gl.getProgramInfoLog(shader));
	}

	gl.useProgram(shaders.sp);

	var sp = shaders.sp;
	
	var va = gl.getAttribLocation(sp, "aVertex");
	var na = gl.getAttribLocation(sp, "aNormal");
	var ta = gl.getAttribLocation(sp, "aColor");
	var txa = gl.getAttribLocation(sp, "aTextureCoordinates");

	var mvUniform = gl.getUniformLocation(sp, "uMVMatrix");
	var pmUniform = gl.getUniformLocation(sp, "uPMatrix");
	var nmUniform = gl.getUniformLocation(sp, "uNMatrix");
	
	var ttUniform = gl.getUniformLocation(sp, "vTextureType");
	
	var lightPositionUniform = gl.getUniformLocation(sp, "uLightPosition");
	var ambientUniform = gl.getUniformLocation(sp, "uAmbientLightColor");
	var diffuseUniform = gl.getUniformLocation(sp, "uDiffuseLightColor");
	var specularUniform = gl.getUniformLocation(sp, "uSpecularLightColor");
	
	var tex0Uniform = gl.getUniformLocation(sp, "uSampler");
	
	gl.uniform1i(tex0Uniform, 0);
	
	gl.uniform3fv(lightPositionUniform, LIGHT_POSITION);
	gl.uniform3fv(ambientUniform, MATERIAL_AMBIENT);
	gl.uniform3fv(diffuseUniform, MATERIAL_DIFFUSE);
	gl.uniform3fv(specularUniform, MATERIAL_SPECULAR);

	var pmMatrix = makePerspective(PERSPECTIVE_P1, PERSPECTIVE_P2, PERSPECTIVE_P3, PERSPECTIVE_P4);

	var mvMatrixStack = [];
	var mvMatrix = Matrix.I(4);

	function pushMatrix(m) {
		if (m) {
			mvMatrixStack.push(m.dup());
			mvMatrix = m.dup();
		} else {
			mvMatrixStack.push(mvMatrix.dup());
		}
	}

	function popMatrix() {
		if (mvMatrixStack.length == 0) {
			throw "Invalid popMatrix!";
		}
		mvMatrix = mvMatrixStack.pop();
		return mvMatrix;
	}

	function multMatrix(m) {
		mvMatrix = mvMatrix.x(m);
	}

	function setMatrixUniforms() {
		gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
		gl.uniformMatrix4fv(pmUniform, false, new Float32Array(pmMatrix.flatten()));
		
		var normalMatrix = mat3.create();
		mat4.toInverseMat3(mvMatrix.flatten(), normalMatrix);
		mat3.transpose(normalMatrix);
		gl.uniformMatrix3fv(nmUniform, false, normalMatrix);
	}

	function mvTranslate(v) {
		var m = Matrix.Translation($V([v[0],v[1],v[2]])).ensure4x4();
		multMatrix(m);
	}

	function mvRotate(ang, v) {
		var arad = ang * Math.PI / 180.0;
		var m = Matrix.Rotation(arad, $V([v[0], v[1], v[2]])).ensure4x4();
		multMatrix(m);
	}

	function mvScale(v) {
		var m = Matrix.Diagonal([v[0], v[1], v[2], 1]);
		multMatrix(m);
	}

	function mvInvert() {
		mvMatrix = mvMatrix.inv();
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	
	var midx = sf.midxyz.x;
	var midy = sf.midxyz.y;
	var midz = sf.midxyz.z;

	mvTranslate([0, 0, 0]);
	var m = makeLookAt(0,0-(LOOK_DISTANCE),0+(LOOK_HEIGHT),0,0,0+(LOOK_HEIGHT),0,0,1);
	multMatrix(m);
	
	mvRotate(ROTATE_X,[0,1,0]);
	mvRotate(ROTATE_Y,[1,0,0]);
	mvRotate(ROTATE_Z,[0,0,1]);
	mvScale([1,1,1]);

	var currentRotationX = 0;
	var currentRotationY = 0;
	
	var geometryForRenderNum = sf.geometryForRenderList.length;
			
	loadBuffer();
	drawBuffer();
	
    function f() {
        drawBuffer();
        requestId = window.requestAnimFrame(f, canvas);
    };
    f();

	function loadBuffer() {
		for (var i=0;i<geometryForRenderNum;i++) {
			var current = sf.geometryForRenderList[i];
			var drawType = current.type;
			var textureType = current.textureType;
			if (drawType == "triangle") {
				current.buffers.position = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.position);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.mesh.position), gl.STATIC_DRAW);

				if (na != -1) {
					current.buffers.normal = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.normal);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.mesh.normal), gl.STATIC_DRAW);
				}

				if (txa != -1 && textureType == 2) {
					current.buffers.texcoord = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.texcoord);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.mesh.texcoord), gl.STATIC_DRAW);
					
					current.buffers.texture = gl.createTexture();
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, current.buffers.texture);
					gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				}
			
				if (ta != -1 && textureType == 1) {
					current.buffers.color = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.color);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.color), gl.STATIC_DRAW);
				}
			} else {
				current.buffers.position = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.position);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.mesh.position), gl.STATIC_DRAW);
				
				current.buffers.color = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.color);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(current.color), gl.STATIC_DRAW);
			}
		}
	}
	
	function drawBuffer() {
		for (var i=0;i<geometryForRenderNum;i++) {
			var current = sf.geometryForRenderList[i];
			var drawType = current.type;
			var textureType = current.textureType;
			gl.uniform1i(ttUniform, textureType);
			if (drawType == "triangle") {
				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.position);
				gl.vertexAttribPointer(va, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(va);

				if (na != -1) {
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.normal);
					gl.vertexAttribPointer(na, 3, gl.FLOAT, false, 0, 0);
					gl.enableVertexAttribArray(na);
				}
				
				if (txa != -1 && textureType == 2) {
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.texcoord);
					gl.vertexAttribPointer(txa, 2, gl.FLOAT, false, 0, 0);
					gl.enableVertexAttribArray(txa);
					
					gl.disableVertexAttribArray(ta);
					
					if (current.texture.complete && !current.texturebound) {
						current.texturebound = true;
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, current.texture);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
						if (current.texture.width > 0 && current.texture.height > 0) {
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
							
							//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
							//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
						}
					}
						
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, current.buffers.texture);
					gl.uniform1i(tex0Uniform, 0);
				}
				
				if (ta != -1 && textureType == 1) {
					gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.color);
					gl.vertexAttribPointer(ta, 4, gl.FLOAT, false, 0, 0);
					gl.enableVertexAttribArray(ta);
					
					gl.disableVertexAttribArray(txa);
				}
			
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.position);
				gl.vertexAttribPointer(va, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(va);

				gl.bindBuffer(gl.ARRAY_BUFFER, current.buffers.color);
				gl.vertexAttribPointer(ta, 4, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(ta);
			}
			
			var ge = current;
			draw(ge, drawType);
		}
	
	}
	
	function draw(ge, type) {
		pushMatrix();
		mvRotate(currentRotationX,[0,0,1]);
		mvRotate(currentRotationY,[1,0,0]);
		
		setMatrixUniforms();
		
		var numVertexPoints = ge.mesh.position.length / 3;
		
		if (type == "triangle") {
			gl.drawArrays(gl.TRIANGLES, 0, numVertexPoints);
		} else {
			gl.drawArrays(gl.LINE_STRIP, 0, numVertexPoints);
		}
					
		popMatrix();
	}
	
	var mouseDown = false;
	var lastX = 0;
	var lastY = 0;

	function mouseDownHandler(ev) {
		mouseDown = true;
		lastX = ev.screenX;
		lastY = ev.screenY;
		
		return true;
	}
	
	function mouseMoveHandler(ev) {
		if (!mouseDown) {
			return false;
		}
		
		updateRotateByScreen(ev);
		
		return true;
	}
	
	function updateRotateByScreen(ev) {
		updateRotate(ev.screenX, ev.screenY);
	}
	
	function updateRotate(x, y) {
		var mdeltaX = lastX - x;
		var mdeltaY = lastY - y;
		lastX = x;
		lastY = y;
		
		currentRotationX -= mdeltaX;
		while (currentRotationX < 0) {
			currentRotationX += 360;
		}
		if (currentRotationX >= 360) {
			currentRotationX = currentRotationX % 360;
		}
		
		currentRotationY -= mdeltaY;
		while (currentRotationY < 0) {
			currentRotationY += 360;
		}
		if (currentRotationY >= 360) {
			currentRotationY = currentRotationY % 360;
		}
	}

	function mouseUpHandler(ev) {
		mouseDown = false;
	}

	canvas.addEventListener("mousedown", mouseDownHandler, false);
	canvas.addEventListener("mousemove", mouseMoveHandler, false);
	canvas.addEventListener("mouseup", mouseUpHandler, false);
}

function handleLoad() {
	sf = new ModelLoader();
	sf._loadHandler = setup;
	sf.load(MODEL_FILE_NAME);
}

window.onload = handleLoad;
