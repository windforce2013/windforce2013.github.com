/*
	Pandora Collada Viewer
	Windforce
	
	ModelLoader
	Load and parse model file, then get the model data.
*/

MAX_GEOMETRY_NUM = 1000000;

function nodeText(n) {
	var s = "";
	for (c = n.firstChild;c;c = c.nextSibling) {
		if (c.nodeType != 3) {
			break;
		}
		s += c.textContent;
	}
	return s;
}

function parseFloatListString (s) {
	if (s == "") {
		return [];
	}
    
	var ss = s.split(/\s+/);
	var res = Array(ss.length);
	for (var i = 0, j = 0; i < ss.length; i++) {
		if (ss[i].length == 0) {
			continue;
		}
      
		res[j++] = parseFloat(ss[i]);
	}
	return res;
}

function parseIntListString (s) {
	if (s == "") {
		return [];
	}
    
	var ss = s.split(/\s+/);
	var res = Array(ss.length);
	for (var i = 0, j = 0; i < ss.length; i++) {
		if (ss[i].length == 0) {
			continue;
		}
      
		res[j++] = parseInt(ss[i]);
	}
	return res;
}

function runSoon(f) {
	setTimeout(f, 0);
}

function xpathGetElementById(xmldoc, id) {
	return xmldoc.evaluate("//*[@id=\"" + id + "\"]", xmldoc, null,
                         XPathResult.FIRST_ORDERED_NODE_TYPE,
                         null).singleNodeValue;
}

function ModelLoader() {
	
}

ModelLoader.prototype = {
	load: function load_dae_file(src) {
		var xhr = new XMLHttpRequest();
		var self = this;
		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 0)) {
				runSoon(function () {
					var xml = xhr.responseXML;
					xml.getElementById = function(id) {
						return xpathGetElementById(xml, id);
					};
					self.parse(xml);

					if (self._loadHandler) {
						runSoon(function () {self._loadHandler.apply(window); });
					}
					
                });
			}
		};

		xhr.open("GET", src, true);
		xhr.overrideMimeType("text/xml");
		xhr.setRequestHeader("Content-Type", "text/xml");
		xhr.send(null);
	},

	parse: function parse_dae_model(xml) {
	
		function nsResolver(prefix) {
			var ns = {
				'c' : 'http://www.collada.org/2005/11/COLLADASchema'
			};
			return ns[prefix] || null;
		}

		function getNode(xpathexpr) {
			return xml.evaluate(xpathexpr, xml, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		}
		
		function getImageUrl(num) {
			var node1 = getNode('//c:library_geometries/c:geometry['+num+']/@id');
			if(!node1) {
				return null;
			}
			var geometryId = node1.nodeValue;
			
			node1 = getNode('//c:library_geometries/c:geometry['+num+']/c:mesh/c:triangles[1]/@material');
			if(!node1) {
				return null;
			}
			var material = node1.nodeValue;
			
			node1 = getNode("//c:instance_geometry[@url='#"+geometryId+"']//c:instance_material/@target");
			if(!node1) {
				return null;
			}
			var materialTargetId = node1.nodeValue;
			materialTargetId = materialTargetId.replace("#","");
			
			node1 = getNode("//c:library_materials/c:material[@id='"+materialTargetId+"']/c:instance_effect/@url");
			if(!node1) {
				return null;
			}
			var effectUrl = node1.nodeValue;
			effectUrl = effectUrl.replace("#","");
			
			node1 = getNode("//c:library_effects/c:effect[@id='"+effectUrl+"']/c:profile_COMMON/c:technique/c:lambert/c:diffuse/c:texture/@texture");
			if(!node1) {
				return null;
			}
			var textureId = node1.nodeValue;
			
			node1 = getNode("//c:library_effects/c:effect[@id='"+effectUrl+"']/c:profile_COMMON/c:newparam[@sid='"+textureId+"']/c:sampler2D/c:source");
			if(!node1) {
				return null;
			}
			var textureSourceId = node1.textContent;
			
			node1 = getNode("//c:library_effects/c:effect[@id='"+effectUrl+"']/c:profile_COMMON/c:newparam[@sid='"+textureSourceId+"']/c:surface/c:init_from");
			if(!node1) {
				return null;
			}
			var textureFileId = node1.textContent;
			
			node1 = getNode("//c:library_images/c:image[@id='"+textureFileId+"']/c:init_from");
			if(!node1) {
				return null;
			}
			var imageUrl = node1.textContent;
			
			return imageUrl;
		}
		
		function getColor(num) {
			var colorArr = [];
			var node1 = getNode('//c:library_geometries/c:geometry['+num+']/@id');
			if(!node1) {
				return null;
			}
			var geometryId = node1.nodeValue;
			
			if (getNode('//c:library_geometries/c:geometry['+num+']//c:triangles')) {
				for (var i=1;i<11;i++) {
					node1 = getNode('//c:library_geometries/c:geometry['+num+']/c:mesh/c:triangles['+i+']/@material');
					if(!node1) {
						break;
					}
					var material = node1.nodeValue;
				
					node1 = getNode('//c:library_geometries/c:geometry['+num+']/c:mesh/c:triangles['+i+']/@count');
					if(!node1) {
						return null;
					}
					var count = node1.nodeValue;
					
					node1 = getNode("//c:instance_geometry[@url='#"+geometryId+"']//c:instance_material[@symbol='"+material+"']/@target");
					if(!node1) {
						return null;
					}
					var materialTargetId = node1.nodeValue;
					materialTargetId = materialTargetId.replace("#","");
					
					node1 = getNode("//c:library_materials/c:material[@id='"+materialTargetId+"']/c:instance_effect/@url");
					if(!node1) {
						return null;
					}
					var effectUrl = node1.nodeValue;
					effectUrl = effectUrl.replace("#","");
					
					node1 = getNode("//c:library_effects/c:effect[@id='"+effectUrl+"']/c:profile_COMMON/c:technique/c:lambert/c:diffuse/c:color");
					if(!node1) {
						return null;
					}
					var colorStr = node1.textContent;
					var arr = colorStr.split(" ");
					for (var j=0;j<count;j++) {
						colorArr.push(arr[0]);
						colorArr.push(arr[1]);
						colorArr.push(arr[2]);
						colorArr.push(arr[3]);
						
						colorArr.push(arr[0]);
						colorArr.push(arr[1]);
						colorArr.push(arr[2]);
						colorArr.push(arr[3]);
						
						colorArr.push(arr[0]);
						colorArr.push(arr[1]);
						colorArr.push(arr[2]);
						colorArr.push(arr[3]);
					}
				}
			} else {
				node1 = getNode('//c:library_geometries/c:geometry['+num+']//c:lines/@count');
				if(!node1) {
					return null;
				}
				var count = node1.nodeValue;
				
				node1 = getNode('//c:library_geometries/c:geometry['+num+']//c:lines/@material');
				if(!node1) {
					return null;
				}
				var material = node1.nodeValue;
				
				node1 = getNode("//c:instance_geometry[@url='#"+geometryId+"']//c:instance_material[@symbol='"+material+"']/@target");
				if(!node1) {
					return null;
				}
				var materialTargetId = node1.nodeValue;
				materialTargetId = materialTargetId.replace("#","");
					
				node1 = getNode("//c:library_materials/c:material[@id='"+materialTargetId+"']/c:instance_effect/@url");
				if(!node1) {
					return null;
				}
				var effectUrl = node1.nodeValue;
				effectUrl = effectUrl.replace("#","");
					
				node1 = getNode("//c:library_effects/c:effect[@id='"+effectUrl+"']/c:profile_COMMON/c:technique//c:color");
				if(!node1) {
					return null;
				}
				
				var colorStr = node1.textContent;
				var arr = colorStr.split(" ");
				for (var j=0;j<count;j++) {
					colorArr.push(arr[0]);
					colorArr.push(arr[1]);
					colorArr.push(arr[2]);
					colorArr.push(arr[3]);
					
					colorArr.push(arr[0]);
					colorArr.push(arr[1]);
					colorArr.push(arr[2]);
					colorArr.push(arr[3]);
				}
			}	
			return colorArr;
		}

		var isYUp = true;
		var upAxisNode = getNode('//c:asset/c:up_axis');
		if (upAxisNode) {
			var val = nodeText(upAxisNode);
			if (val.indexOf("Z_UP") != 1) {
				isYUp = false;
			}
		}
		
		this.geometryList = [];
		this.geometryForRenderList = [];
		this.midxyz = {x: "", y: "", z: ""};
		
		for (var i=1;i<MAX_GEOMETRY_NUM;i++) {
			var meshNode = getNode('//c:library_geometries/c:geometry['+i+']/c:mesh');
			
			if (!meshNode) {
				break;
			}
			
			var meshId = getNode('//c:library_geometries/c:geometry['+i+']/@id').nodeValue;
			
			var tempColor = getColor(i);
			if (tempColor) {
				this.geometryList.push({id: meshId, meshNode: meshNode, type: 1, color: tempColor, texture: null});
			} else {
				this.geometryList.push({id: meshId, meshNode: meshNode, type: 2, color: null, texture: getImageUrl(i)});
			}
			
		}
		
		this.geometryNum = this.geometryList.length;
		
		var midx=0;
		var midy=0;
		var midz=0;
		
		var meshNum=0;
		var triangleNum=0;
		var lineNum=0;
		
		for (var gnum=1;gnum<=this.geometryNum;gnum++) {
			var baseMesh = { };
			
			var geometryId = this.geometryList[gnum-1].id;
			var meshNode = this.geometryList[gnum-1].meshNode;
			var textureType = this.geometryList[gnum-1].type;
			var texture = this.geometryList[gnum-1].texture;
			var color = this.geometryList[gnum-1].color;
			
			var triangleNumInGeometry = 0;
			var lineNumInGeometry = 0;
			
			var sourceCount = 0;
			var notTri = false;
			var farrays = ['position', 'normal', 'texcoord'];
			for (var i = 0; ; i++) {
				var fname = farrays[i];

				var fnode = getNode('//c:library_geometries/c:geometry['+gnum+']/c:mesh/c:source[' + (i+1) + ']/c:float_array', meshNode);
				if (fnode) {
					sourceCount++;
				} else {
					break;
				}

				var count = parseInt(fnode.getAttribute('count'));
				var data = parseFloatListString(nodeText(fnode));

				if (data.length < count) {
					return false;
				}

				baseMesh[fname] = data;
			}
			
			var indices = [];
			var coords = [];
			for (var i=1;i<2;i++) {
				var inode = getNode('//c:library_geometries/c:geometry['+gnum+']/c:mesh/c:triangles['+i+']/c:p');
				if (!inode) {
					if (i==1) {
						notTri=true;
						inode = getNode('//c:library_geometries/c:geometry['+gnum+']/c:mesh/c:lines['+i+']/c:p');
						pStr = nodeText(inode);
						indices = parseIntListString(pStr);
					}
					break;
				}
				
				var inputCount=0;
				for (var ii=1;ii<3;ii++) {
					var nodeTriangles = getNode('//c:library_geometries/c:geometry['+gnum+']/c:mesh/c:triangles['+i+']/c:input['+ii+']');
					if (!nodeTriangles) {
						break;
					}
					inputCount++;
				}
				
				var pStr = nodeText(inode);
				var tempTotalIndice = parseIntListString(pStr);
				var tempIndices;
				var tempCoords;
				
				tempIndices = [];
				tempCoords = [];
				
				if (inputCount>=2) {
					for (var ii2=0;ii2<tempTotalIndice.length;ii2=ii2+2) {
						tempIndices.push(tempTotalIndice[ii2]);
						tempCoords.push(tempTotalIndice[ii2+1]);
					}
					indices = indices.concat(tempIndices);
					coords = coords.concat(tempCoords);
				} else {
					indices = indices.concat(tempTotalIndice);
				}	
			}
			
			var baseLen = Math.floor(indices.length);
			var coordLen = Math.floor(coords.length);
			
			var mesh = {
				position: Array(baseLen*3),
				normal: Array(baseLen*3), 
				texcoord: Array(coordLen*2)
			};
			
			if (notTri) {
				for (var i = 0; i < baseLen; i++) {
					var vindex = indices[i];
					mesh.position[i*3  ] = baseMesh.position[vindex*3  ];
					mesh.position[i*3+1] = baseMesh.position[vindex*3+1];
					mesh.position[i*3+2] = baseMesh.position[vindex*3+2];
				}

				meshNum++;
				lineNumInGeometry = baseLen - 1;
				lineNum = lineNum + lineNumInGeometry;
				this.geometryForRenderList.push({id: geometryId, mesh: mesh, triangles: 0, lines: lineNum, color: color, texture: "", texturebound: false, type: "line", textureType: 1, buffers: {position: {}, normal: {}, texture: {}, color: {}}});
				continue;
			}

			var minx = Infinity, miny = Infinity, minz = Infinity;
			var maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
			var npoints = Math.floor(baseMesh.position.length / 3);
			for (var i = 0; i < npoints; ++i) {
				var x = baseMesh.position[i*3  ];
				var y = baseMesh.position[i*3+1];
				var z = baseMesh.position[i*3+2];

				minx = Math.min(minx, x);
				miny = Math.min(miny, y);
				minz = Math.min(minz, z);

				maxx = Math.max(maxx, x);
				maxy = Math.max(maxy, y);
				maxz = Math.max(maxz, z);
			}

			mesh.bbox = {
				min: { x: minx, y: miny, z: minz },
				max: { x: maxx, y: maxy, z: maxz }
			};

			for (var i = 0; i < baseLen; i++) {
				var index = indices[i];
				mesh.position[i*3  ] = baseMesh.position[index*3  ];
				mesh.position[i*3+1] = baseMesh.position[index*3+1];
				mesh.position[i*3+2] = baseMesh.position[index*3+2];
				
				mesh.normal[i*3  ] = baseMesh.normal[index*3  ];
				mesh.normal[i*3+1] = baseMesh.normal[index*3+1];
				mesh.normal[i*3+2] = baseMesh.normal[index*3+2];
			}
			
			if (textureType == 2) {
				for (var i = 0; i < coordLen; i++) {
					var tindex = coords[i];
					mesh.texcoord[i*2  ] = baseMesh.texcoord[tindex*2  ];
					mesh.texcoord[i*2+1] = baseMesh.texcoord[tindex*2+1];
				}
			}

			meshNum++;
			triangleNumInGeometry = baseLen - 2;
			triangleNum = triangleNum + triangleNumInGeometry;
			
			if (textureType == 1) {
				this.geometryForRenderList.push({id: geometryId, mesh: mesh, triangles: triangleNumInGeometry, lines: 0, color: color, texture: "", texturebound: false, type: "triangle", textureType: 1, buffers: {position: {}, normal: {}, texture: {}, texcoord: {}, color: {}}});
			} else {
				var uri = xml.baseURI.toString();
				uri = uri.substr(0, uri.lastIndexOf("/")) + "/" + texture;

				var img = new Image();
				img.src = uri;
				
				this.geometryForRenderList.push({id: geometryId, mesh: mesh, triangles: triangleNumInGeometry, lines: 0, color: null, texture: img, texturebound: false, type: "triangle", textureType: 2, buffers: {position: {}, normal: {}, texture: {}, texcoord: {}, color: {}}});
			}
			
			midx += (mesh.bbox.min.x + mesh.bbox.max.x) / 2;
			midy += (mesh.bbox.min.y + mesh.bbox.max.y) / 2;
			midz += (mesh.bbox.min.z + mesh.bbox.max.z) / 2;
		}
		
		midx = midx/this.geometryNum;
		midy = midy/this.geometryNum;
		midz = midz/this.geometryNum;
		
		this.midxyz = {x:midx, y:midy, z:midz}
		
		document.getElementById("meshNum").value=meshNum;
		document.getElementById("triangleNum").value=triangleNum;
		document.getElementById("lineNum").value=lineNum;
		return true;
	}
};
