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
let mapData = [];
const cameraSpeed = 1; 
const cameraDelta = { x: 0, y: 10, z: 0 };


async function initAgentsModel() {
  const data = {
    NAgents: 10, 
    width: 28,   
    height: 28   
  }
  try {
    let response = await fetch(agent_server_uri + 'init', {
      method: 'POST', 
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    })

    if(response.ok){
      let result = await response.json()
      console.log(result.message)
      
    }
      
  } catch (error) {
    console.log('Error initializing model',error)    
  }
}

let agents = [];
async function getAgents() {
  try {
    const response = await fetch(agent_server_uri + "getAgents");
    if (response.ok) {
      const result = await response.json();
      const positions = result.positions;

      if (positions.length === 0) {
        console.warn("No agent positions received.");
        return;
      }

      const updatedAgentIds = new Set();

      for (const agentData of positions) {
        const agentId = agentData.id;

        // Obtener la rotación según el símbolo actual del agente
        const rotation = getRotationFromDirection(agentData.symbol);

        let agent = agents.find((a) => a.id === agentId);

        if (agent) {
          // Si la posición o el símbolo (y, por ende, la rotación) ha cambiado
          if (
            agent.position[0] !== agentData.x ||
            agent.position[1] !== agentData.y ||
            agent.position[2] !== agentData.z ||
            agent.symbol !== agentData.symbol // Ahora también verificamos el símbolo
          ) {
            agent.position = [agentData.x, agentData.y, agentData.z];
            agent.symbol = agentData.symbol; // Actualizamos el símbolo
            agent.rotation = rotation; // Actualizamos la rotación
          }
        } else {
          // Crear un nuevo agente
          agent = {
            id: agentId,
            position: [agentData.x, agentData.y, agentData.z],
            rotation: rotation,
            color: [0.0, 1.0, 0.0],
            objPath: "/obj/coche.obj",
            bufferInfo: null,
            loaded: false,
            symbol: agentData.symbol,
          };

          await drawAgent(agent);
          agents.push(agent);
        }

        updatedAgentIds.add(agentId);
      }

      // Eliminar agentes que ya no existen en el servidor
      agents = agents.filter((agent) => updatedAgentIds.has(agent.id));
      

      console.log("Agents updated:", agents);
    } else {
      console.error("Error fetching agents:", response.statusText);
    }
  } catch (error) {
    console.error("Error in getAgents:", error);
  }
}

async function update() {
  try {
    const response = await fetch(agent_server_uri + "update");
    if (response.ok) {
      const result = await response.json();
      console.log(result.message);

      await getAgents();

      // Only redraw if there are visible changes
      drawScene();
    } else {
      console.error("Error during model update:", response.statusText);
    }
  } catch (error) {
    console.error("Error in update:", error);
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
  setInterval(update, 1000);

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


async function generateGeometryFromMap(mapData) {
  const positions = [];
  const colors = [];
  

  const objects = {
    "#": { path: "/obj/edificio2.obj" },
    "S": { path: "/obj/semaforo.obj" },
    "v": { path: "/obj/cubo.obj" },
    "<": { path: "/obj/cuboi.obj" },
    ">": { path: "/obj/cuboi.obj" },
    "^": { path: "/obj/cubo.obj" },
    "N": { path: "/obj/cubov.obj" },
    "O": {path: "/obj/objeto.obj"},
    "A": {path: "/obj/arbol.obj"},
  };

  const processed = Array(mapData.length)
    .fill(false)
    .map(() => Array(mapData[0].length).fill(false));
  

  for (let z = 0; z < mapData.length; z++) {
    const row = mapData[z];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];

      if (cell === "#" && !processed[z][x]) {
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
              colors.push(...objDataCube.a_color.data);
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
          colors.push(...objDataBuilding.a_color.data);
        }
      } else if (cell === "S" && !processed[z][x]) {
        const objDataTrafficLight = await loadObjFromFile(objects["S"].path);
        if (objDataTrafficLight) {
          for (let i = 0; i < objDataTrafficLight.a_position.data.length; i += 3) {
            positions.push(
              objDataTrafficLight.a_position.data[i] + x,
              objDataTrafficLight.a_position.data[i + 1] + 1, 
              objDataTrafficLight.a_position.data[i + 2] + z
            );
          }
          colors.push(...objDataTrafficLight.a_color.data);
        }

        const objDataCube = await loadObjFromFile(objects["N"].path);
        if (objDataCube) {
          for (let i = 0; i < objDataCube.a_position.data.length; i += 3) {
            positions.push(
              objDataCube.a_position.data[i] + x,
              objDataCube.a_position.data[i + 1],
              objDataCube.a_position.data[i + 2] + z
            );
          }
          colors.push(...objDataCube.a_color.data);
        }
      }else if (( cell === "v" || cell === "^") && !processed[z][x]) {
        const objData = await loadObjFromFile(objects["v"].path);
        if (objData) {
          for (let i = 0; i < objData.a_position.data.length; i += 3) {
            positions.push(
              objData.a_position.data[i] + x,
              objData.a_position.data[i + 1], 
              objData.a_position.data[i + 2] + z
            );
          }
          colors.push(...objData.a_color.data);
        }
      }else if (( cell === "<" || cell === ">") && !processed[z][x]) {
        const objData = await loadObjFromFile(objects["<"].path);
        if (objData) {
          for (let i = 0; i < objData.a_position.data.length; i += 3) {
            positions.push(
              objData.a_position.data[i] + x,
              objData.a_position.data[i + 1], 
              objData.a_position.data[i + 2] + z
            );
          }
          colors.push(...objData.a_color.data);
        }
      
              

      }else if (cell === "A" && !processed[z][x]) {
        const objDataTree = await loadObjFromFile(objects["A"].path);
        if (objDataTree) {
          for (let i = 0; i < objDataTree.a_position.data.length; i += 3) {
            positions.push(
              objDataTree.a_position.data[i] + x,
              objDataTree.a_position.data[i + 1] + 1,
              objDataTree.a_position.data[i + 2] + z
            );
          }
          colors.push(...objDataTree.a_color.data);
        }
      
        const objDataCube = await loadObjFromFile(objects["N"].path);
        if (objDataCube) {
          for (let i = 0; i < objDataCube.a_position.data.length; i += 3) {
            positions.push(
              objDataCube.a_position.data[i] + x,
              objDataCube.a_position.data[i + 1], 
              objDataCube.a_position.data[i + 2] + z
            );
          }
          colors.push(...objDataCube.a_color.data);
        }
      }else if (objects[cell] && !processed[z][x]) {
        const objData = await loadObjFromFile(objects[cell].path);

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
          colors.push(...objData.a_color.data);
        }
      }

    }
  }

  return {
    position: new Float32Array(positions),
    color: new Float32Array(colors),
    
  };
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

  return mapData; 
}



function getRotationFromDirection(symbol) {
  switch (symbol) {
    case 'v': return -Math.PI / 2;
    case '^': return Math.PI / 2;      
    case '>': return Math.PI;
    case '<': return 0;
    default: return 0; 
  }
}

async function drawAgent(agent) {
  const {  objPath, symbol } = agent;

  const objData = await loadObjFromFile(objPath);
  if (!objData) {
    console.error(`Error al cargar el modelo para el agente ${agent.id}`);
    return;
  }

  const agentGeometry = {
    a_position: { numComponents: 3, data: new Float32Array(objData.a_position.data) },
    a_color: { numComponents: 4, data: new Float32Array(objData.a_color.data) },
    a_normal: { numComponents: 3, data: new Float32Array(objData.a_normal.data) },
  };

  agent.bufferInfo = twgl.createBufferInfoFromArrays(gl, agentGeometry);
  agent.loaded = true;

  agent.rotation = getRotationFromDirection(symbol);
}



function drawScene() {
  updateCameraPosition();

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.2, 0.2, 0.2, 1);
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
  twgl.setUniforms(programInfo, { u_matrix: viewProjectionMatrix });
  twgl.drawBufferInfo(gl, mapBufferInfo);

  if (agents && agents.length > 0) {
    for (const agent of agents) {
      if (agent.loaded && agent.bufferInfo) {
        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, agent.bufferInfo);

        const modelMatrix = twgl.m4.identity();
        twgl.m4.translate(modelMatrix, agent.position, modelMatrix); 
        twgl.m4.rotateY(modelMatrix, agent.rotation, modelMatrix); 

        const uniforms = {
          u_matrix: twgl.m4.multiply(viewProjectionMatrix, modelMatrix), 
        };

        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, agent.bufferInfo);
      }
    }
  }

  requestAnimationFrame(drawScene);
}




function loadMtl(mtlContent) {
  const materials = {};
  let currentMaterial = null;

  const lines = mtlContent.split("\n");

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length === 0 || parts[0].startsWith("#")) return;

    switch (parts[0]) {
      case "newmtl":
        currentMaterial = parts[1];
        materials[currentMaterial] = { Ka: [1, 1, 1], Kd: [1, 1, 1], Ks: [0, 0, 0], Ns: 0, d: 1 };
        break;
      case "Ka":
        materials[currentMaterial].Ka = parts.slice(1).map(parseFloat);
        break;
      case "Kd":
        materials[currentMaterial].Kd = parts.slice(1).map(parseFloat);
        break;
      case "Ks":
        materials[currentMaterial].Ks = parts.slice(1).map(parseFloat);
        break;
      case "Ns":
        materials[currentMaterial].Ns = parseFloat(parts[1]);
        break;
      case "d":
        materials[currentMaterial].d = parseFloat(parts[1]);
        break;
      default:
        break;
    }
  });

  return materials;
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
  let currentMaterialName = null;

  const lines = objContent.split("\n");
  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length === 0 || parts[0].startsWith("#")) return;

    switch (parts[0]) {
      case "v": 
        vertices.push(parts.slice(1).map(parseFloat));
        break;

      case "vn": 
        hasNormals = true;
        normals.push(parts.slice(1).map(parseFloat));
        break;

      case "f": 
        const face = parts.slice(1).map((v) => {
          const [vIdx, , nIdx] = v.split("//").map((x) => (x ? parseInt(x, 10) - 1 : undefined));
          return { vIdx, nIdx };
        });

        face.forEach(({ vIdx, nIdx }) => {
          jsonObject.a_position.data.push(...vertices[vIdx]);

          if (hasNormals && nIdx !== undefined) {
            jsonObject.a_normal.data.push(...normals[nIdx]);
          } else {
            jsonObject.a_normal.data.push(0, 0, 0);
          }

          if (currentMaterialName && materials[currentMaterialName]) {
            const mat = materials[currentMaterialName];
            jsonObject.a_color.data.push(...mat.Kd, mat.d); 
          } else {
            jsonObject.a_color.data.push(1.0, 1.0, 1.0, 1.0); 
          }
        });

        faces.push(face);
        break;

      case "usemtl": 
        currentMaterialName = parts[1];
        break;

      default:
        break;
    }
  });

  const normalizeVertices = (vertices) => {
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    vertices.forEach((v) => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], v[i]);
        max[i] = Math.max(max[i], v[i]);
      }
    });

    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    const maxRange = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

    return vertices.map((v) => [
      (v[0] - center[0]) / maxRange,
      (v[1] - center[1]) / maxRange,
      (v[2] - center[2]) / maxRange,
    ]);
  };

  const normalizedVertices = normalizeVertices(vertices);

  jsonObject.a_position.data = [];
  faces.forEach((face) => {
    face.forEach(({ vIdx }) => {
      jsonObject.a_position.data.push(...normalizedVertices[vIdx]);
    });
  });

  if (!hasNormals) {
    console.warn("El archivo OBJ no contiene normales (vn). Generando normales por defecto.");
  }

  return jsonObject;
}

function setupUI() {
  const gui = new GUI();

  // Crear una carpeta para la posición de la cámara
  const posFolder = gui.addFolder('Posición de la cámara');

  posFolder.add(cameraPosition, 'x', -100, 100).onChange((value) => {
    cameraPosition.x = value;
  });

  posFolder.add(cameraPosition, 'y', -100, 100).onChange((value) => {
    cameraPosition.y = value;
  });

  posFolder.add(cameraPosition, 'z', -100, 100).onChange((value) => {
    cameraPosition.z = value;
  });

  posFolder.open(); 
}

main();