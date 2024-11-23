import * as twgl from "twgl.js";

let gl, programInfo, mapBufferInfo;
let canvas, cameraPosition, target;

const cameraSpeed = 1; 
const cameraDelta = { x: 0, y: 10, z: 0 };

async function main() {
  canvas = document.querySelector("canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 no está disponible en este navegador.");
    return;
  }

  const vs = `#version 300 es
  in vec4 position;
  in vec3 color;

  uniform mat4 u_matrix;

  out vec3 v_color;

  void main() {
    gl_Position = u_matrix * position;
    v_color = color;
  }`;

  const fs = `#version 300 es
  precision highp float;

  in vec3 v_color;

  out vec4 outColor;

  void main() {
    outColor = vec4(v_color, 1.0);
  }`;

  programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  cameraPosition = { x: -10, y: 0, z: 0 };
  target = [0, 0, 0];

  setupKeyboardControls();
  

  await setupMapFromFile("map.txt");
  if (!mapBufferInfo) {
    console.error("No se pudo cargar el mapa.");
    return;
  }
  console.log("Mapa cargado correctamente.", mapBufferInfo);

  requestAnimationFrame(drawScene);
  if (!mapBufferInfo || mapBufferInfo.numElements === 0) {
    console.error("El buffer de geometría está vacío o no configurado correctamente.");
  }
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

async function loadObjFromFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudo cargar el archivo OBJ ${url}`);
    const objContent = await response.text();
    return loadObj(objContent);
  } catch (error) {
    console.error("Error cargando el archivo OBJ:", error);
    return null;
  }
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
    "#": "/obj/edificio1.obj",
    "S": "/obj/semaforo.obj",
    "v": "/obj/cubo.obj",
    "<": "/obj/cubo.obj",
    ">": "/obj/cubo.obj", 
    "^": "/obj/cubo.obj", 
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
        const offsetY = Math.max(0.5, scaleY / 2);

        const objData = await loadObjFromFile(objects["#"]);
        if (objData) {
          for (let i = 0; i < objData.a_position.data.length; i += 3) {
            positions.push(
              objData.a_position.data[i] * scaleX + offsetX,
              objData.a_position.data[i + 1] * scaleY + offsetY,
              objData.a_position.data[i + 2] * scaleZ + offsetZ
            );
          }
          colors.push(
            ...Array(objData.a_position.data.length / 3)
              .fill([1.0, 0.0, 0.0])
              .flat()
          );
        }
      } else if (objects[cell]) {
        if (!processed[z][x]) {
          const objData = await loadObjFromFile(objects[cell]);
          let color = [1.0, 1.0, 1.0];

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

            if (cell === "S") {
              color = [0.4, 0.4, 0.4];
            } else if (cell === "v" || cell === "<" || cell === ">" || cell === "^") {
              color = [0.5, 0.5, 0.5];
            }

            colors.push(...Array(objData.a_position.data.length / 3).fill(color).flat());
          }
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
    mapBufferInfo = twgl.createBufferInfoFromArrays(gl, geometryData);
  }
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


function loadObj(objContent) {
  const jsonObject = {
      a_position: { numComponents: 3, data: [] },
      a_color: { numComponents: 4, data: [] },
      a_normal: { numComponents: 3, data: [] }
  };

  const vertices = [];
  const normals = [];
  const faces = [];
  let hasNormals = false;

  const lines = objContent.split('\n');

  lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      try {
          if (parts[0] === 'vn') {
              hasNormals = true;
              normals.push(parts.slice(1).map(parseFloat));
          } else if (parts[0] === 'v') {
              vertices.push(parts.slice(1).map(parseFloat));
          } else if (parts[0] === 'f') {
              const face = parts.slice(1).map(v => {
                  const [vIdx, , nIdx] = v.split('//').map(x => (x ? parseInt(x, 10) - 1 : undefined));
                  if (vIdx >= 0 && vIdx < vertices.length) {
                      return { vIdx, nIdx };
                  } else {
                      throw new Error("Índice de vértice fuera de rango");
                  }
              });
              faces.push(face);
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

      vertices.forEach(v => {
          for (let i = 0; i < 3; i++) {
              if (v[i] < min[i]) min[i] = v[i];
              if (v[i] > max[i]) max[i] = v[i];
          }
      });

      const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
      const maxRange = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

      return vertices.map(v => [
          (v[0] - center[0]) / maxRange,
          (v[1] - center[1]) / maxRange,
          (v[2] - center[2]) / maxRange
      ]);
  };

  const normalizedVertices = normalizeVertices(vertices);

  faces.forEach(face => {
      face.forEach(({ vIdx, nIdx }) => {
          jsonObject.a_position.data.push(...normalizedVertices[vIdx]);

          if (nIdx !== undefined && nIdx >= 0 && nIdx < normals.length) {
              jsonObject.a_normal.data.push(...normals[nIdx]);
          }
      });
  });

  return jsonObject;
}

main();
