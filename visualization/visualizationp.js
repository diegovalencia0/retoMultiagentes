// import * as twgl from "twgl.js";

// const vs = `#version 300 es
// in vec4 position;
// in vec3 color;

// uniform mat4 u_matrix;

// out vec3 v_color;

// void main() {
//   gl_Position = u_matrix * position;
//   v_color = color;
// }`;

// const fs = `#version 300 es
// precision highp float;

// in vec3 v_color;

// out vec4 outColor;

// void main() {
//   outColor = vec4(v_color, 1.0);
// }`;

'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

// Define the vertex shader code, using GLSL 3.00
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;
in vec3 color;


uniform mat4 u_transforms;
uniform mat4 u_matrix;

out vec4 v_color;

void main() {
gl_Position = u_matrix * a_position;
v_color = a_color;
}
`;

// Define the fragment shader code, using GLSL 3.00
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
outColor = v_color;
}
`;
const agent_server_uri = "http://localhost:8585/";

let gl, programInfo, mapBufferInfo;
let canvas, cameraPosition, target;

const cameraSpeed = 1; 
const cameraDelta = { x: 0, y: 10, z: 0 };


async function initAgentsModel() {
  try {
    let response = await fetch(agent_server_uri + "init", {
      method: 'POST', 
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    })

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON and log the message
      let result = await response.json()
      console.log(result.message)
    }
      
  } catch (error) {
    // Log any errors that occur during the request
    console.log(error)    
  }
}

async function main() {
  canvas = document.querySelector("canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 no está disponible en este navegador.");
    return;
  }

  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  cameraPosition = { x: 10, y: 10, z: 0 };
  target = [0, 0, 0];

  setupKeyboardControls(); 
  setupUI(); 

  await setupMapFromFile("map.txt");
  if (!mapBufferInfo) {
    console.error("No se pudo cargar el mapa.");
    return;
  }
  console.log("Mapa cargado correctamente.", mapBufferInfo);

  requestAnimationFrame(drawScene);

  await initAgentsModel();
  await getAgents();

}

function setupKeyboardControls() {
  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "ArrowUp": 
        cameraDelta.z = -cameraSpeed;
        break;
      case "ArrowDown": 
        cameraDelta.z = cameraSpeed;
        break;
      case "ArrowLeft": 
        cameraDelta.x = -cameraSpeed;
        break;
      case "ArrowRight": 
        cameraDelta.x = cameraSpeed;
        break;
    }
  });

  document.addEventListener("keyup", (event) => {
    switch (event.key) {
      case "ArrowUp":
      case "ArrowDown":
        cameraDelta.z = 0;
        break;
      case "ArrowLeft":
      case "ArrowRight":
        cameraDelta.x = 0;
        break;
    }
  });
}

function updateCameraPosition() {
  cameraPosition.x += cameraDelta.x;
  cameraPosition.z += cameraDelta.z;

  target = [cameraPosition.x, 0, cameraPosition.z - 10];
}

async function loadObjFromFile(path) {
  const objContent = await fetch(path).then(res => res.text());
  const mtlPath = path.replace(".obj", ".mtl");

  let mtlContent = "";
  try {
    mtlContent = await fetch(mtlPath).then(res => res.text());
  } catch (e) {
    console.warn(`No se encontró archivo MTL para ${path}`);
  }

  return loadObj(objContent, mtlContent); 
}


async function loadMapFromFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar el archivo ${url}`);
    const text = await response.text();
    return text.split("\n").map((line) => line.split(""));
  } catch (error) {
    console.error("Error cargando el archivo:", error);
    return [];
  }
}
// function generateUniformColors(vertexCount, color) {
//   const triangleCount = vertexCount / 3; 
//   return Array(triangleCount)
//     .fill(color) // Aplica el mismo color a cada triángulo
//     .flatMap(c => c.concat(c, c)); // Repite el color tres veces (una por vértice)
// }

async function generateGeometryFromMap(mapData) {
  const positions = [];
  const colors = [];
 //azul :[0.0, 0.0, 1.0, 1.0]
 //amarillo: [1.0, 1.0, 0.0, 1.0]
  //gris: [0.5, 0.5, 0.5, 1.0]
  //cian: [0.0, 1.0, 1.0, 1.0]
  //magenta: [1.0, 0.0, 1.0, 1.0]
  //verde: [0.0, 1.0, 0.0, 1.0]
  //gris claro: [0.7, 0.7, 0.7, 1.0]
  //gris fuerte : [0.2, 0.2, 0.2, 1.0]
  const objects = {
    
    "#": { path: "/obj/edificio2.obj", color: [0.2, 0.2, 0.2, 1.0] },
    "S": { path: "/obj/semaforo.obj", color: [0.0, 1.0, 0.0, 1.0] }, 
    "v": { path: "/obj/cubo.obj", color:  [0.5, 0.5, 0.5, 1.0] }, 
    "<": { path: "/obj/cubo.obj", color: [0.5, 0.5, 0.5, 1.0] }, 
    ">": { path: "/obj/cubo.obj", color: [0.5, 0.5, 0.5, 1.0] }, 
    "^": { path: "/obj/cubo.obj", color: [0.5, 0.5, 0.5, 1.0] }, 
    "N": { path: "/obj/cubo.obj", color: [0.0, 0.0, 1.0, 1.0] }
  };

  const agentColor = [1.0, 1.0, 1.0, 1.0]; 
  const processed = Array(mapData.length)
    .fill(false)
    .map(() => Array(mapData[0].length).fill(false));

  for (let z = 0; z < mapData.length; z++) {
    const row = mapData[z];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];

      if (cell === "#") {
        if (!processed[z][x]) {
          let width = 0;
          let height = 0;

          while (x + width < row.length && mapData[z][x + width] === "#" && !processed[z][x + width]) {
            width++;
          }

          while (
            z + height < mapData.length &&
            mapData[z + height].slice(x, x + width).every((c, i) => c === "#" && !processed[z + height][x + i])
          ) {
            height++;
          }

          for (let dz = 0; dz < height; dz++) {
            for (let dx = 0; dx < width; dx++) {
              processed[z + dz][x + dx] = true;
            }
          }

          const offsetX = x + width / 2;
          const offsetZ = z + height / 2;
          const scaleX = width;
          const scaleZ = height;
          const scaleY = Math.max(1.0, Math.sqrt(width * height)); 
          const baseOffsetY = 0;

          for (let dz = 0; dz < height; dz++) {
            for (let dx = 0; dx < width; dx++) {
              const objDataCube = await loadObjFromFile(objects["N"].path);
              if (objDataCube) {
                for (let i = 0; i < objDataCube.a_position.data.length; i += 3) {
                  positions.push(
                    objDataCube.a_position.data[i] + (x + dx),
                    objDataCube.a_position.data[i + 1] + baseOffsetY,
                    objDataCube.a_position.data[i + 2] + (z + dz)
                  );
                }
                colors.push(...generateUniformColors(objDataCube.a_position.data.length / 3, objects["N"].color));
              }
            }
          }

          const objDataBuilding = await loadObjFromFile(objects["#"].path);
          if (objDataBuilding) {
            for (let i = 0; i < objDataBuilding.a_position.data.length; i += 3) {
              positions.push(
                objDataBuilding.a_position.data[i] * scaleX + offsetX,
                objDataBuilding.a_position.data[i + 1] * scaleY + baseOffsetY + scaleY / 2,
                objDataBuilding.a_position.data[i + 2] * scaleZ + offsetZ
              );
            }
            colors.push(
              ...generateUniformColors(objDataBuilding.a_position.data.length / 3, objects["#"].color)
            );
          }
        }
      }
      else if (cell === "N") {
        const agentOffsetY = 0.7;
        const agentPath = "/obj/coche.obj";
        const objDataAgent = await loadObjFromFile(agentPath);
      
        if (objDataAgent) {
          for (let i = 0; i < objDataAgent.a_position.data.length; i += 3) {
            positions.push(
              objDataAgent.a_position.data[i] + x,
              objDataAgent.a_position.data[i + 1] + agentOffsetY,
              objDataAgent.a_position.data[i + 2] + z
            );
          }
          colors.push(
            ...generateUniformColors(objDataAgent.a_position.data.length / 3, agentColor)
          );
        }
      
        const objDataCube = await loadObjFromFile(objects["N"].path);
        if (objDataCube) {
          for (let i = 0; i < objDataCube.a_position.data.length; i += 3) {
            positions.push(
              objDataCube.a_position.data[i] + x,
              objDataCube.a_position.data[i + 1] - 1, 
              objDataCube.a_position.data[i + 2] + z
            );
          }
          colors.push(...generateUniformColors(objDataCube.a_position.data.length / 3, objects["N"].color));
        }
      } else if (cell === "S") {
        const objDataTrafficLight = await loadObjFromFile(objects["S"].path);
        if (objDataTrafficLight) {
          for (let i = 0; i < objDataTrafficLight.a_position.data.length; i += 3) {
            positions.push(
              objDataTrafficLight.a_position.data[i] + x,
              objDataTrafficLight.a_position.data[i + 1] + 1, 
              objDataTrafficLight.a_position.data[i + 2] + z
            );
          }
          colors.push(...generateUniformColors(objDataTrafficLight.a_position.data.length / 3, objects["S"].color));
        }
      
        const objDataCube = await loadObjFromFile(objects["N"].path);
        if (objDataCube) {
          for (let i = 0; i < objDataCube.a_position.data.length; i += 3) {
            positions.push(
              objDataCube.a_position.data[i] + x,
              objDataCube.a_position.data[i + 1] - 1, 
              objDataCube.a_position.data[i + 2] + z
            );
          }
          colors.push(...generateUniformColors(objDataCube.a_position.data.length / 3, objects["N"].color));
        }
      }
      
      else if (objects[cell] && !processed[z][x]) {
        const objData = await loadObjFromFile(objects[cell].path);
        const color = objects[cell].color;

        if (objData) {
          const offsetX = x * 1.0;
          const offsetZ = z * 1.0;
          const offsetY = 0.0;

          for (let i = 0; i < objData.a_position.data.length; i += 3) {
            positions.push(
              objData.a_position.data[i] + offsetX,
              objData.a_position.data[i + 1] + offsetY,
              objData.a_position.data[i + 2] + offsetZ
            );
          }
          colors.push(...generateUniformColors(objData.a_position.data.length / 3, color));
        }
      }
    }
  }

  return {
    position: new Float32Array(positions),
    color: new Float32Array(colors),
  };
}

function generateUniformColors(vertexCount, color) {
  const colors = [];
  for (let i = 0; i < vertexCount; i++) {
    colors.push(...color);
  }
  return colors;
}




async function setupMapFromFile(url) {
  const mapData = await loadMapFromFile(url);
  const geometryData = await generateGeometryFromMap(mapData);
  if (geometryData) {
    mapBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      a_position: { numComponents: 3, data: geometryData.position },
      a_color: { numComponents: 4, data: geometryData.color },
    });
  }
}

async function getAgents() {
  try {
    const response = await fetch(agent_server_uri + "getAgents");
    if (response.ok) {
      const result = await response.json();
      const positions = result.positions;

      if (positions.length === 0) {
        console.warn("No se recibieron posiciones de agentes.");
        return;
      }

      

      const mapWidth = Math.sqrt(mapBufferInfo.a_position.data.length / 3);
      const mapHeight = mapWidth;

      const agents = [];
      for (let i = 0; i < positions.length; i++) {
        const agent = positions[i];
        const x = Math.floor(agent.position[0]);
        const z = Math.floor(agent.position[2]);

        const y = getTerrainHeight(x, z, mapWidth, mapBufferInfo);

        if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
          const agentObject = {
            id: agent.id || `agent_${i}`,
            position: [x, y, z],
            color: [0.0, 1.0, 0.0],
            objPath: "/obj/coche.obj",
          };

          agents.push(agentObject);
          drawAgent(agentObject); 
        }
      }

      console.log("Agentes ubicados:", agents);
    } else {
      console.error("Error al obtener agentes:", response.statusText);
    }
  } catch (error) {
    console.error("Error en getAgents:", error);
  }
}np

function getTerrainHeight(x, z, mapWidth, mapBufferInfo) {
  const index = (z * mapWidth + x) * 3; 

  if (index + 1 >= mapBufferInfo.a_position.data.length) {
    console.warn("Índice fuera de rango al calcular altura del terreno.");
    return 0;
  }

  return mapBufferInfo.a_position.data[index + 1] || 0; 
}

async function drawAgent(agent) {
  const { position, color, objPath } = agent;

  const objData = await loadObjFromFile(objPath);
  if (!objData) {
    console.error(`Error al cargar el modelo para el agente ${agent.id}`);
    return;
  }

  const transformedPositions = [];
  for (let i = 0; i < objData.a_position.data.length; i += 3) {
    transformedPositions.push(
      objData.a_position.data[i] + position[0],
      objData.a_position.data[i + 1] + position[1],
      objData.a_position.data[i + 2] + position[2]
    );
  }

  const agentGeometry = {
    a_position: { numComponents: 3, data: new Float32Array(transformedPositions) },
    a_color: { numComponents: 4, data: new Float32Array(objData.a_color.data) },
    a_normal: { numComponents: 3, data: new Float32Array(objData.a_normal.data) },
  };

  const agentBufferInfo = twgl.createBufferInfoFromArrays(gl, agentGeometry);

  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, agentBufferInfo);

  const viewProjectionMatrix = twgl.m4.multiply(
    twgl.m4.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100),
    twgl.m4.inverse(
      twgl.m4.lookAt(
        [cameraPosition.x, cameraPosition.y, cameraPosition.z],
        target,
        [0, 1, 0]
      )
    )
  );

  const uniforms = {
    u_matrix: viewProjectionMatrix,
  };

  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, agentBufferInfo);
}


function drawScene() {
  updateCameraPosition();

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix = twgl.m4.perspective((Math.PI / 4), aspect, 0.1, 100);
  const cameraMatrix = twgl.m4.lookAt(
    [cameraPosition.x, cameraPosition.y, cameraPosition.z],
    target,
    [0, 1, 0]
  );
  const viewMatrix = twgl.m4.inverse(cameraMatrix);
  const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, mapBufferInfo);

  const uniforms = {
    u_matrix: viewProjectionMatrix, 
  };
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, mapBufferInfo);

  gl.clearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  requestAnimationFrame(drawScene);
}

function loadObj(objContent, mtlContent) {
  const jsonObject = {
    a_position: { numComponents: 3, data: [] },
    a_color: { numComponents: 4, data: [] },
    a_normal: { numComponents: 3, data: [] },
  };

  const vertices = [];
  const normals = [];
  const faces = [];
  let hasNormals = false;

  const materials = loadMtl(mtlContent); 

  const lines = objContent.split("\n");

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    try {
      if (parts[0] === "vn") {
        hasNormals = true;
        normals.push(parts.slice(1).map(parseFloat));
      } else if (parts[0] === "v") {
        vertices.push(parts.slice(1).map(parseFloat));
      } else if (parts[0] === "f") {
        const face = parts.slice(1).map((v) => {
          const [vIdx, , nIdx] = v.split("//").map((x) => (x ? parseInt(x, 10) - 1 : undefined));
          if (vIdx >= 0 && vIdx < vertices.length) {
            return { vIdx, nIdx };
          } else {
            throw new Error("Índice de vértice fuera de rango");
          }
        });
        faces.push(face);
      } else if (parts[0] === "usemtl") {
        const materialName = parts[1];
        jsonObject.currentMaterial = materials[materialName] || [1.0, 1.0, 1.0, 1.0]; 
      }
    } catch (e) {
      console.warn(`Error procesando línea: "${line}" - ${e.message}`);
    }
  });

  if (!hasNormals) {
    console.error("El archivo OBJ no contiene normales (vn). No se puede procesar.");
    return null;
  }

  const normalizeVertices = (vertices) => {
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    vertices.forEach((v) => {
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) min[i] = v[i];
        if (v[i] > max[i]) max[i] = v[i];
      }
    });

    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const maxRange = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

    return vertices.map((v) => [
      (v[0] - center[0]) / maxRange,
      (v[1] - center[1]) / maxRange,
      (v[2] - center[2]) / maxRange,
    ]);
  };

  const normalizedVertices = normalizeVertices(vertices);

  faces.forEach((face) => {
    face.forEach(({ vIdx, nIdx }) => {
      jsonObject.a_position.data.push(...normalizedVertices[vIdx]);

      if (nIdx !== undefined && nIdx >= 0 && nIdx < normals.length) {
        jsonObject.a_normal.data.push(...normals[nIdx]);
      }

      jsonObject.a_color.data.push(...(jsonObject.currentMaterial || [1.0, 1.0, 1.0, 1.0]));
    });
  });

  return jsonObject;
}

function loadMtl(mtlContent) {
  const materials = {};
  let currentMaterial = null;

  const lines = mtlContent.split("\n");

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "newmtl") {
      currentMaterial = parts[1];
      materials[currentMaterial] = [1.0, 1.0, 1.0, 1.0]; 
    } else if (parts[0] === "Kd" && currentMaterial) {
      const color = parts.slice(1).map(parseFloat);
      materials[currentMaterial] = [...color, 1.0]; 
    } else if (parts[0] === "d" && currentMaterial) {
      materials[currentMaterial][3] = parseFloat(parts[1]);
    }
  });

  return materials;
}

function setupUI() {
  // Crear una instancia de lil-gui
  const gui = new GUI();

  // Crear una carpeta para la posición de la cámara
  const posFolder = gui.addFolder('Posición de la cámara');

  // Agregar sliders para cada eje
  posFolder.add(cameraPosition, 'x', -100, 100).onChange((value) => {
    cameraPosition.x = value;
  });

  posFolder.add(cameraPosition, 'y', -100, 100).onChange((value) => {
    cameraPosition.y = value;
  });

  posFolder.add(cameraPosition, 'z', -100, 100).onChange((value) => {
    cameraPosition.z = value;
  });

  posFolder.open(); // Abre la carpeta por defecto
}

main();
