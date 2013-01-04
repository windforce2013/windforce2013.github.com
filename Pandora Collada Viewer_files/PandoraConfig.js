/*
	Pandora Collada Viewer
	Windforce
	
	PandoraConfig
	Config the parameter.
*/

set1 = {filename: "./model/Cube.dae", lightlocation: [9000.0, 9000.0, 9000.0], distance: 325, height: 0};
set2 = {filename: "./model/IPAD.dae", lightlocation: [9000.0, 9000.0, 9000.0], distance: 25, height: 0};
set3 = {filename: "./model/Iphone5.dae", lightlocation: [9000.0, 9000.0, 9000.0], distance: 175, height: 0};
set4 = {filename: "./model/Camera.dae", lightlocation: [9000.0, 9000.0, 9000.0], distance: 5, height: 1};
set5 = {filename: "./model/Car.dae", lightlocation: [9000.0, 9000.0, 9000.0], distance: 1255, height: 100};

active_set = set3;

MODEL_FILE_NAME = active_set.filename;
LIGHT_POSITION = active_set.lightlocation;
LOOK_DISTANCE = active_set.distance;
LOOK_HEIGHT = active_set.height;

ROTATE_X = 0;
ROTATE_Y = 0;
ROTATE_Z = 0;

VIEW_PORT_WIDTH = 800;
VIEW_PORT_HEIGHT = 450;

PERSPECTIVE_P1 = 70;
PERSPECTIVE_P2 = 16/9;
PERSPECTIVE_P3 = 1;
PERSPECTIVE_P4 = 100000000;

MATERIAL_AMBIENT = [0.8, 0.8, 0.8];
MATERIAL_DIFFUSE = [0.8, 0.8, 0.8];
MATERIAL_SPECULAR = [1.2, 1.2, 1.2];

SHOW_STATS = false;

v_shader_script = [
	"attribute vec3 aVertex;",
	"attribute vec3 aNormal;",
	"attribute vec4 aColor;",
	"attribute vec2 aTextureCoordinates;",
	"\n",
	"uniform mat4 uPMatrix;",
	"uniform mat4 uMVMatrix;",
	"uniform mat3 uNMatrix;",
	"\n",
	"varying vec4 vColor;",
	"varying vec2 vTextureCoordinates;",
	"varying vec3 vNormalEye;",
	"varying vec3 vPositionEye3;",
	"\n",
	"void main(void) {",
	"\n",
	"	vColor = aColor;",
	"\n",
	"	vec4 vertexPositionEye4 = uMVMatrix * vec4(aVertex, 1.0);",
	"	vPositionEye3 = vertexPositionEye4.xyz / vertexPositionEye4.w;",
	"\n",
	"	vNormalEye = normalize(uNMatrix * aNormal);",
	"\n",
	"	gl_Position = uPMatrix * uMVMatrix * vec4(aVertex, 1.0);",
	"	vTextureCoordinates = aTextureCoordinates;", 
	"}"
	].join("\n");
	
f_shader_script = [
	"precision mediump float;\n",
	"varying vec4 vColor;",
	"varying vec2 vTextureCoordinates;",
	"varying vec3 vNormalEye;",
	"varying vec3 vPositionEye3;",
	"uniform vec3 uLightPosition;",
	"uniform vec3 uAmbientLightColor;",
	"uniform vec3 uDiffuseLightColor;",
	"uniform vec3 uSpecularLightColor;",
	"uniform sampler2D uSampler;",
	"uniform int vTextureType;",
	"const float shininess = 32.0;",

	"void main(void) {",
	"	vec3 vectorToLightSource = normalize(uLightPosition - vPositionEye3);",
	"	float diffuseLightWeightning = max(dot(vNormalEye, vectorToLightSource), 0.0);",	   
	"	vec3 reflectionVector = normalize(reflect(-vectorToLightSource, vNormalEye));",
	"	vec3 viewVectorEye = -normalize(vPositionEye3);",
	"	float rdotv = max(dot(reflectionVector, viewVectorEye), 0.0);",
	"	float specularLightWeightning = pow(rdotv, shininess);",
	"	vec3 lightWeighting = uAmbientLightColor + ",
	"					  uDiffuseLightColor * diffuseLightWeightning + ",
	"					  uSpecularLightColor * specularLightWeightning;",
	"	vec4 textureColor;",
	"	if (vTextureType == 1) {",
	"		textureColor = vColor;",
	"	} else {",
	"		textureColor = texture2D(uSampler, vTextureCoordinates);",
	"	}",
	"	gl_FragColor = vec4(lightWeighting.rgb * textureColor.rgb, textureColor.a);",
	"}"
	].join("\n");

VERTEX_SHADER_SCRIPT = v_shader_script;
FRAGMENT_SHADER_SCRIPT = f_shader_script;

