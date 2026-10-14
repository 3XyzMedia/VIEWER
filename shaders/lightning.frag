precision highp float;
in vec2 vUv; // Координаты пикселя от 0 до 1 по X/Y
out vec4 fragColor;
uniform sampler2D iChannel0; // Текстура шума (можно заменить на hash)
uniform float uTime;        // Время анимации
uniform vec2 uResolution;   // Разрешение экрана

// Простая функция хеша для замены текстуры шума
vec2 hash(vec2 p) {
    return fract(sin(vec2(dot(p.xy ,vec2(127.1, 311.7)), dot(p.yx ,vec2(269.5,183.3))) * 43758.5453);
}

float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0.0,0.0)).x,
                 hash(i + vec2(1.0,0.0)).x, u.x),
               mix(hash(i + vec2(0.0,1.0)).x,
                  hash(i + vec2(1.0,1.0)).x, u.x), u.y);
}

// Fractal Brownian Motion (fBm) — основа ветвистости
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    
    for (int i = 0; i < 6; i++) { 
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= .5;
    }
    return value;
}

void main() {
    vec2 uv = vUv - 0.5; // Центрирование координат
    uv.x *= uResolution.x / uResolution.y; // Сохранение пропорций

    // Основная линия молнии
    float line = smoothstep(-0.01, 0.0, abs(uv.x));

    // Ветвления
    float branches = 0.0;
    const int numBranches = 5;
    for(int i = 0; i < numBranches; i++) {
        float offsetX = sin(float(i) * 3.14159 * 0.2 + uTime * 0.5);
        float branchPos = vec2(offsetX * 0.1, uv.y);
        
        // Добавляем шум Перлина для случайности формы
        float n = fbm(branchPos * 10.0 + uTime * 0.2);
        branches += smoothstep(0.01, 0.0, length(branchPos) - n * 0.02);
    }

    // Общая интенсивность
    float intensity = clamp(line + branches * 0.5, 0.0, 1.0);

    // Мерцание и затухание
    intensity *= pow(clamp((sin(uTime * 10.0) + 1.0) * 0.5, 0.0, 1.0), 2.0);

    // Цвет
    vec3 color = mix(vec3(0.0, 0.8, 1.0), vec3(1.0), intensity * 0.8);

    fragColor = vec4(color * intensity * 3.0, intensity); // Умножаем на 3 для эффекта Bloom
}