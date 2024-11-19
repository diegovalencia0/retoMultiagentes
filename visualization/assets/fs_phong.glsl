#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_lightDirection;
in vec3 v_cameraDirection;

// Scene uniforms
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

// Material uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    // Ambient light component
    vec4 ambient = u_ambientLight * u_ambientColor;

    // Diffuse light component
    vec4 diffuse = vec4(0, 0, 0, 1);
    vec3 v_n_n = normalize(v_normal);
    vec3 v_l_n = normalize(v_lightDirection);
    float lambert = dot(v_n_n, v_l_n);

    if (lambert > 0.0) {
        diffuse = u_diffuseLight * u_diffuseColor * lambert;
    }
   
    // Specular
    vec4 specular = vec4(0, 0, 0, 1);
    vec3 v_c_n = normalize(v_cameraDirection);

    float dotForParallel = dot(v_n_n, v_l_n); // Descomentada esta línea
    vec3 v_parallel = v_n_n * dotForParallel;
    vec3 v_perpendicular = v_l_n - v_parallel;

    vec3 reflex = v_parallel - v_perpendicular;

    if (dot(v_c_n, reflex) > 0.0 && dot(v_n_n, v_l_n) > 0.0) {
        specular = u_specularLight * u_specularColor * pow(dot(v_c_n, reflex), u_shininess);
    }

    outColor = ambient + diffuse + specular;
}
