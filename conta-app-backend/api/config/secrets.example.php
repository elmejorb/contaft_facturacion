<?php
/**
 * PLANTILLA de secretos y API keys de servicios externos.
 *
 * INSTALACIÓN:
 *   1. Copia este archivo como `secrets.php` (mismo directorio)
 *   2. Rellena las claves reales
 *   3. NO lo subas a git (el .gitignore ya lo excluye)
 *
 * Cada cliente puede además configurar su propia key en `tbldatosempresa`
 * (ej. columna `groq_api_key`). El código busca primero en la BD y hace
 * fallback a este archivo si la columna está vacía.
 */

return [
    // Groq (chat IA, filtrado semántico, redacción)
    // Obtén tu key en: https://console.groq.com/keys
    'groq_api_key' => '',

    // OpenAI (opcional — para visión / GPT-4o si se agrega)
    // 'openai_api_key' => '',

    // Gemini (opcional — para visión / escaneo de facturas)
    // 'gemini_api_key' => '',
];
