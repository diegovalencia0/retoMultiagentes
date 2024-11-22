import * as twgl from "twgl.js";

// Variables globales
let gl, programInfo, buffers = [];
let canvas, cameraPosition, target;

async function main() {
  // Configuración inicial del canvas y contexto WebGL
  canvas = document.querySelector("canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 no está disponible en este navegador.");
    return;
  }

  // Shader para posiciones y colores
  const vs = `#version 300 es
  in vec4 position;
  in vec3 normal;

  uniform mat4 u_matrix;

  out vec3 v_normal;

  void main() {
    gl_Position = u_matrix * position;
    v_normal = normal;
  }`;

  const fs = `#version 300 es
  precision highp float;

  in vec3 v_normal;

  out vec4 outColor;

  void main() {
    vec3 color = normalize(v_normal) * 0.5 + 0.5; // Simple shading
    outColor = vec4(color, 1.0);
  }`;

  programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  // Configuración inicial de la cámara
  cameraPosition = { x: 0, y: 10, z: 20 };
  target = [0, 0, 0];

  // Configurar la escena
  await setupScene();

  // Iniciar la animación
  requestAnimationFrame(drawScene);
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

function addTransformToObject(objData, transform) {
  const { translation, scale } = transform;
  const transformedData = { ...objData };

  for (let i = 0; i < objData.a_position.data.length; i += 3) {
    const x = objData.a_position.data[i] * scale[0] + translation[0];
    const y = objData.a_position.data[i + 1] * scale[1] + translation[1];
    const z = objData.a_position.data[i + 2] * scale[2] + translation[2];

    transformedData.a_position.data[i] = x;
    transformedData.a_position.data[i + 1] = y;
    transformedData.a_position.data[i + 2] = z;
  }

  return transformedData;
}

async function setupScene() {
  const mapData = await loadMapFromFile("map.txt");

  // Mapeo de archivos OBJ a cargar
  const objPaths = {
    road: "/assets/coche.obj",
    wall: "/assets/coche.obj",
    start: "/assets/coche.obj",
    default: "/assets/coche.obj",
  };

  // Cargar todos los OBJ como una promesa
  const loadedObjects = {};
  await Promise.all(
    Object.entries(objPaths).map(async ([key, path]) => {
      try {
        const objText = await fetch(path).then((response) => response.text());
        loadedObjects[key] = loadObj(objText);
      } catch (error) {
        console.error(`Error cargando el objeto ${key} desde ${path}:`, error);
      }
    })
  );

  console.log("Objetos cargados:", loadedObjects);

  // Generar objetos basados en el mapa
  const objectsData = await generateCubesFromMap(mapData, loadedObjects);

  // Crear buffers para cada objeto
  objectsData.forEach((obj) => {
    const buffer = twgl.createBufferInfoFromArrays(gl, obj);
    buffers.push(buffer);
  });
  console.log("Buffers creados:", buffers);
}

async function generateCubesFromMap(mapData, loadedObjects) {
  const objects = [];

  // Generar objetos basados en el mapa
  for (let z = 0; z < mapData.length; z++) {
    const row = mapData[z];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];

      let objectKey = null;
      if (cell === "<" || cell === ">" || cell === "v" || cell === "^") {
        objectKey = "start";
      } else if (cell === "#") {
        objectKey = "wall";
      } else if (cell === "S") {
        objectKey = "start";
      } else {
        objectKey = "default";
      }

      if (objectKey && loadedObjects[objectKey]) {
        const transform = {
          translation: [x, 0, z],
          scale: [1, 1, 1],
        };

        const transformedObject = addTransformToObject(
          loadedObjects[objectKey],
          transform
        );

        // Depuración: Mostrar el objeto transformado en la consola
        console.log(`Objeto generado en (${x}, ${z}):`, transformedObject);

        objects.push(transformedObject);
      }
    }
  }

  // Depuración: Mostrar el array completo de objetos generados
  console.log("JSON completo generado por generateCubesFromMap:", objects);

  return objects;
}

function drawScene() {
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Matriz de proyección y vista
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

  buffers.forEach((buffer) => {
    twgl.setBuffersAndAttributes(gl, programInfo, buffer);

    const uniforms = {
      u_matrix: viewProjectionMatrix,
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, buffer);
  });

  requestAnimationFrame(drawScene);
}

// Función `loadObj` tal como fue proporcionada
function loadObj(objContent) {
  const jsonObject = {
    a_position: { numComponents: 3, data: [] },
    a_color: { numComponents: 4, data: [] },
    a_normal: { numComponents: 3, data: [] },
  };

  const vertices = [];
  const normals = [];
  const faces = [];
  let hasNormals = false;

  const lines = objContent.split("\n");

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "vn") {
      hasNormals = true;
      normals.push(parts.slice(1).map(parseFloat));
    } else if (parts[0] === "v") {
      vertices.push(parts.slice(1).map(parseFloat));
    } else if (parts[0] === "f") {
      const face = parts.slice(1).map((v) => {
        const [vIdx, , nIdx] = v.split("//").map((x) =>
          x ? parseInt(x, 10) - 1 : undefined
        );
        return { vIdx, nIdx };
      });
      faces.push(face);
    }
  });

  if (!hasNormals) {
    console.error("El archivo OBJ no contiene normales.");
    return null;
  }

  faces.forEach((face) => {
    face.forEach(({ vIdx, nIdx }) => {
      jsonObject.a_position.data.push(...vertices[vIdx]);
      if (nIdx !== undefined) {
        jsonObject.a_normal.data.push(...normals[nIdx]);
      }
    });
  });

  return jsonObject;
}

function generateObstacleData(size){

  let arrays =
  {
      a_position: {
              numComponents: 3,
              data: [
                // Front Face
                -0.5, -0.5,  0.5,
                0.5, -0.5,  0.5,
                0.5,  0.5,  0.5,
               -0.5,  0.5,  0.5,

               // Back face
               -0.5, -0.5, -0.5,
               -0.5,  0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5, -0.5, -0.5,

               // Top face
               -0.5,  0.5, -0.5,
               -0.5,  0.5,  0.5,
                0.5,  0.5,  0.5,
                0.5,  0.5, -0.5,

               // Bottom face
               -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5,  0.5,
               -0.5, -0.5,  0.5,

               // Right face
                0.5, -0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5,  0.5,  0.5,
                0.5, -0.5,  0.5,

               // Left face
               -0.5, -0.5, -0.5,
               -0.5, -0.5,  0.5,
               -0.5,  0.5,  0.5,
               -0.5,  0.5, -0.5
              ].map(e => size * e)
          },
      a_color: {
              numComponents: 4,
              data: [
                // Front face
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                  0, 0, 0, 1, // v_1
                // Back Face
                  0.333, 0.333, 0.333, 1, // v_2
                  0.333, 0.333, 0.333, 1, // v_2
                  0.333, 0.333, 0.333, 1, // v_2
                  0.333, 0.333, 0.333, 1, // v_2
                // Top Face
                  0.5, 0.5, 0.5, 1, // v_3
                  0.5, 0.5, 0.5, 1, // v_3
                  0.5, 0.5, 0.5, 1, // v_3
                  0.5, 0.5, 0.5, 1, // v_3
                // Bottom Face
                  0.666, 0.666, 0.666, 1, // v_4
                  0.666, 0.666, 0.666, 1, // v_4
                  0.666, 0.666, 0.666, 1, // v_4
                  0.666, 0.666, 0.666, 1, // v_4
                // Right Face
                  0.833, 0.833, 0.833, 1, // v_5
                  0.833, 0.833, 0.833, 1, // v_5
                  0.833, 0.833, 0.833, 1, // v_5
                  0.833, 0.833, 0.833, 1, // v_5
                // Left Face
                  1, 1, 1, 1, // v_6
                  1, 1, 1, 1, // v_6
                  1, 1, 1, 1, // v_6
                  1, 1, 1, 1, // v_6
              ]
          },
      indices: {
              numComponents: 3,
              data: [
                0, 1, 2,      0, 2, 3,    // Front face
                4, 5, 6,      4, 6, 7,    // Back face
                8, 9, 10,     8, 10, 11,  // Top face
                12, 13, 14,   12, 14, 15, // Bottom face
                16, 17, 18,   16, 18, 19, // Right face
                20, 21, 22,   20, 22, 23  // Left face
              ]
          }
  };
  return arrays;
}
main();
