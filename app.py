import os
import sys
from pathlib import Path
from flask import (
    jsonify,
    request,
    send_from_directory
)
from dotenv import load_dotenv

# =====================================================
# 1. CAMINHOS DO PROJETO
# =====================================================
BASE_DIR = Path(__file__).resolve().parent

BACKEND_DIR = (
    BASE_DIR
    / "paginas"
    / "cyber-shield-brasil"
    / "backend"
)

if not BACKEND_DIR.is_dir():
    raise FileNotFoundError(
        "Pasta do backend não encontrada: "
        f"{BACKEND_DIR}. Confira a estrutura de diretórios do projeto."
    )

backend_path = str(BACKEND_DIR)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# =====================================================
# 2. CARREGAMENTO DAS VARIÁVEIS DE AMBIENTE (.env)
# =====================================================
load_dotenv(BASE_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

# =====================================================
# 3. IMPORTAÇÃO DO APLICATIVO FLASK ORIGINAL
# =====================================================
from app import app

# =====================================================
# 4. IMPORTAÇÃO DOS OITO MÓDULOS
# =====================================================
from modules.url_scan.url_scan import scan_url
from modules.ip_analysis.ip_analysis import analyze_ip
from modules.password_check.password_check import check_password
from modules.domain_analysis.domain_analysis import analyze_domain
from modules.leak_check.leak_check import check_leak
from modules.virustotal.virustotal import analyze_virustotal
from modules.shodan.shodan import shodan_lookup
from modules.reports.reports import generate_report

# =====================================================
# 5. FUNÇÕES AUXILIARES PARA AS APIs
# =====================================================
def get_json_object():
    """Retorna o corpo JSON quando ele é um objeto não vazio."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return None
    return data

def bad_request(message):
    """Padroniza respostas de requisições inválidas."""
    return jsonify({
        "success": False,
        "message": message
    }), 400

def run_module(function, argument, operation_name):
    """Executa um módulo e converte o resultado para resposta JSON."""
    try:
        result = function(argument)
        return jsonify(result)
    except Exception:
        app.logger.exception(
            "Erro durante a operação: %s",
            operation_name
        )
        return jsonify({
            "success": False,
            "message": (
                f"Não foi possível concluir: {operation_name}. "
                "Consulte o terminal do servidor."
            )
        }), 500

# =====================================================
# 6. FRONTEND
# =====================================================
@app.route("/frontend", methods=["GET"])
def frontend():
    return send_from_directory(
        BASE_DIR,
        "index.html"
    )

# =====================================================
# 7. ARQUIVOS ESTÁTICOS DO FRONTEND (Blindado contra escape)
# =====================================================
@app.route("/styles-dark/" + "path:filename", methods=["GET"])
def styles_dark(filename):
    return send_from_directory(
        BASE_DIR / "styles-dark",
        filename
    )

@app.route("/styles-light/" + "path:filename", methods=["GET"])
def styles_light(filename):
    return send_from_directory(
        BASE_DIR / "styles-light",
        filename
    )

@app.route("/script/" + "path:filename", methods=["GET"])
def script_files(filename):
    return send_from_directory(
        BASE_DIR / "script",
        filename
    )

@app.route("/imagens/" + "path:filename", methods=["GET"])
def imagens(filename):
    return send_from_directory(
        BASE_DIR / "imagens",
        filename
    )

# =====================================================
# 8. ROTAS DE TESTE E STATUS
# =====================================================
@app.route("/teste", methods=["GET"])
def teste():
    return "ROTA DO APP PRINCIPAL FUNCIONANDO"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "application": "CyberCheck PRO",
        "status": "online"
    })

# =====================================================
# 9. API - URL SCAN
# =====================================================
@app.route("/api/url-scan", methods=["POST"])
def url_scan_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    url = data.get("url")
    if not isinstance(url, str) or not url.strip():
        return bad_request("URL obrigatória.")
    return run_module(
        scan_url,
        url.strip(),
        "análise de URL"
    )

# =====================================================
# 10. API - IP ANALYSIS
# =====================================================
@app.route("/api/ip-analysis", methods=["POST"])
def ip_analysis_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    ip = data.get("ip")
    if not isinstance(ip, str) or not ip.strip():
        return bad_request("IP obrigatório.")
    return run_module(
        analyze_ip,
        ip.strip(),
        "análise de IP"
    )

# =====================================================
# 11. API - PASSWORD CHECK
# =====================================================
@app.route("/api/password-check", methods=["POST"])
def password_check_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    password = data.get("password")
    if not isinstance(password, str) or password == "":
        return bad_request("Senha obrigatória.")
    return run_module(
        check_password,
        password,
        "verificação de senha"
    )

# =====================================================
# 12. API - DOMAIN ANALYSIS
# =====================================================
@app.route("/api/domain-analysis", methods=["POST"])
def domain_analysis_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    domain = data.get("domain")
    if not isinstance(domain, str) or not domain.strip():
        return bad_request("Domínio obrigatório.")
    return run_module(
        analyze_domain,
        domain.strip(),
        "análise de domínio"
    )

# =====================================================
# 13. API - LEAK CHECK
# =====================================================
@app.route("/api/leak-check", methods=["POST"])
def leak_check_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    email = data.get("email")
    if not isinstance(email, str) or not email.strip():
        return bad_request("E-mail obrigatório.")
    return run_module(
        check_leak,
        email.strip(),
        "verificação de vazamentos"
    )

# =====================================================
# 14. API - VIRUSTOTAL
# =====================================================
@app.route("/api/virustotal", methods=["POST"])
def virustotal_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    target = data.get("target")
    if not isinstance(target, str) or not target.strip():
        return bad_request("Alvo obrigatório.")
    if not os.getenv("VT_API_KEY"):
        return jsonify({
            "success": False,
            "message": "VT_API_KEY não está configurada no arquivo .env."
        }), 503
    return run_module(
        analyze_virustotal,
        target.strip(),
        "consulta ao VirusTotal"
    )

# =====================================================
# 15. API - SHODAN
# =====================================================
@app.route("/api/shodan", methods=["POST"])
def shodan_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON.")
    target = data.get("target")
    if not isinstance(target, str) or not target.strip():
        return bad_request("Alvo obrigatório.")
    return run_module(
        shodan_lookup,
        target.strip(),
        "consulta ao Shodan"
    )

# =====================================================
# 16. API - REPORTS
# =====================================================
@app.route("/api/report", methods=["POST"])
def report_api():
    data = get_json_object()
    if data is None:
        return bad_request("Nenhum dado enviado. Envie um objeto JSON com os dados do relatório.")
    return run_module(
        generate_report,
        data,
        "geração de relatório"
    )

# =====================================================
# 17. LISTAGEM DE ROTAS REGISTRADAS
# =====================================================
@app.route("/routes", methods=["GET"])
def routes():
    routes_list = []
    for rule in app.url_map.iter_rules():
        routes_list.append({
            "endpoint": rule.endpoint,
            "methods": sorted(rule.methods),
            "route": str(rule)
        })
    routes_list.sort(key=lambda item: item["route"])
    return jsonify(routes_list)

# =====================================================
# 18. INICIALIZAÇÃO DO SERVIDOR (Prints limpos sem link HTML)
# =====================================================
if __name__ == "__main__":
    print()
    print("=" * 64)
    print("CYBERCHECK PRO - SERVIDOR PRINCIPAL")
    print("=" * 64)

    print()
    print("FRONTEND")
    print("GET http://127.0.0.1:5000/frontend")

    print()
    print("TESTES E STATUS")
    print("GET http://127.0.0.1:5000/teste")
    print("GET http://127.0.0.1:5000/health")
    print("GET http://127.0.0.1:5000/routes")

    print()
    print("API - URL Scan")
    print("POST http://127.0.0.1:5000/api/url-scan")

    print()
    print("API - IP Analysis")
    print("POST http://127.0.0.1:5000/api/ip-analysis")

    print()
    print("API - Password Check")
    print("POST http://127.0.0.1:5000/api/password-check")

    print()
    print("API - Domain Analysis")
    print("POST http://127.0.0.1:5000/api/domain-analysis")

    print()
    print("API - Leak Check")
    print("POST http://127.0.0.1:5000/api/leak-check")

    print()
    print("API - VirusTotal")
    print("POST http://127.0.0.1:5000/api/virustotal")

    print()
    if os.getenv("VT_API_KEY"):
        print("VT_API_KEY: CONFIGURADA")
    else:
        print("VT_API_KEY: NAO CONFIGURADA")

    print()
    print("API - Shodan")
    print("POST http://127.0.0.1:5000/api/shodan")

    print()
    print("API - Reports")
    print("POST http://127.0.0.1:5000/api/report")

    print()
    print("=" * 64)
    print("SERVIDOR INICIANDO EM http://127.0.0.1:5000")
    print("=" * 64)
    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )