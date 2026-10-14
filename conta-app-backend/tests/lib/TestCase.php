<?php
/**
 * Base class para pruebas de integración.
 *
 * Cada prueba se ejecuta en una BD limpia (conta_test), recargada desde
 * fixtures/conta_test_base.sql antes de cada run(). Nunca toca la BD de
 * ningún cliente.
 */
abstract class TestCase {
    /** @var PDO */
    protected $db;
    /** @var string URL base del backend bajo prueba */
    protected $baseUrl = 'http://localhost/conta-app-backend/api';
    /** @var array Resultados de aserciones (para summary al final) */
    public $results = [];
    public $passed = 0;
    public $failed = 0;

    public function setUp() {
        $driver = $_ENV['TEST_DB_DRIVER'] ?? getenv('TEST_DB_DRIVER') ?: 'mysql';
        if ($driver === 'sqlite') {
            $dbPath = __DIR__ . '/../fixtures/conta_test.db';
            $this->db = new PDO("sqlite:$dbPath", null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->db->exec('PRAGMA foreign_keys = ON');
            $this->db->exec('PRAGMA busy_timeout = 5000');
        } else {
            $this->db = new PDO('mysql:host=localhost;dbname=conta_test;charset=utf8mb4', 'root', 'root', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            // Desactivar strict mode para esta conexión — permite INSERTs mínimos
            // en tablas con muchas columnas NOT NULL sin default.
            $this->db->exec("SET SESSION sql_mode = ''");
        }
    }

    protected function getDriver(): string {
        return $_ENV['TEST_DB_DRIVER'] ?? getenv('TEST_DB_DRIVER') ?: 'mysql';
    }

    abstract public function run();

    // -------- Helpers HTTP ---------------------------------------------------

    protected function postJson($path, $body) {
        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $decoded = json_decode($raw, true);
        return ['http' => $code, 'body' => $decoded, 'raw' => $raw];
    }

    protected function getJson($path, $query = []) {
        $url = $this->baseUrl . $path;
        if ($query) $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($query);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['http' => $code, 'body' => json_decode($raw, true), 'raw' => $raw];
    }

    // -------- Helpers asserciones -------------------------------------------

    protected function assertEquals($expected, $actual, $msg = '') {
        if ($expected == $actual) {
            $this->passed++;
            $this->results[] = ['ok' => true,  'msg' => $msg ?: "equals($expected)"];
        } else {
            $this->failed++;
            $this->results[] = ['ok' => false, 'msg' => ($msg ?: 'equals') . " — esperado=" . var_export($expected, true) . " actual=" . var_export($actual, true)];
        }
    }

    protected function assertTrue($cond, $msg = '') {
        if ($cond) {
            $this->passed++;
            $this->results[] = ['ok' => true, 'msg' => $msg ?: 'true'];
        } else {
            $this->failed++;
            $this->results[] = ['ok' => false, 'msg' => $msg ?: 'esperaba true'];
        }
    }

    protected function assertFalse($cond, $msg = '') {
        $this->assertTrue(!$cond, $msg);
    }

    protected function assertCount($expected, $arr, $msg = '') {
        $this->assertEquals($expected, is_array($arr) ? count($arr) : -1, $msg);
    }

    protected function assertContains($needle, $haystack, $msg = '') {
        $this->assertTrue(strpos((string)$haystack, (string)$needle) !== false,
            $msg ?: "esperaba que '$haystack' contenga '$needle'");
    }

    // -------- Helpers de BD -------------------------------------------------

    protected function fetchOne($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    protected function fetchValue($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    protected function fetchAll($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
