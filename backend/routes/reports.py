import os
from flask import Blueprint, jsonify, request, send_from_directory, current_app

from backend.database.database import get_reports
from backend.services.report_service import generate_report

# Criação unificada do Blueprint para relatórios
reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/', methods=['GET'])
def reports():
    """
    Rota para listar os relatórios gerados salvos no banco de dados.
    """
    try:
        data = get_reports()
        return jsonify({
            "success": True,
            "total": len(data) if isinstance(data, list) else 0,
            "reports": data
        }), 200
    except Exception as e:
        print(f"Erro ao buscar relatórios: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route('/generate', methods=['POST'])
def generate():
    """
    Rota para gerar um novo relatório no formato especificado (pdf, html, csv).
    """
    try:
        payload = request.get_json() or {}
        report_format = payload.get("format", "pdf")
        data = payload.get("data", {})

        result = generate_report(data, report_format)
        return jsonify(result), 200
    except Exception as e:
        print(f"Erro ao gerar relatório: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@reports_bp.route('/download/<path:filename>', methods=['GET'])
def download_report(filename):
    """
    Rota segura para servir os arquivos da pasta storage/reports ao navegador.
    Permite visualizar PDFs ou baixar os relatórios gerados.
    """
    try:
        # Define o diretório onde os relatórios estão armazenados no servidor Render
        directory = os.path.join(current_app.root_path, 'storage', 'reports')
        
        # Normaliza as barras do caminho para compatibilidade entre sistemas operacionais
        filename = filename.replace("\\", "/")
        
        # Remove a pasta base do nome do arquivo caso ela venha incluída no caminho salvo
        if "storage/reports" in filename:
            filename = filename.split("storage/reports/")[-1]
        elif "storage\\reports" in filename:
            filename = filename.split("storage\\reports\\")[-1]

        # as_attachment=False permite que PDFs e HTML abram diretamente no navegador em nova aba
        return send_from_directory(directory, filename, as_attachment=False)

    except Exception as e:
        print(f"Erro ao baixar arquivo: {e}")
        return jsonify({"success": False, "error": "Arquivo não encontrado ou indisponível."}), 404