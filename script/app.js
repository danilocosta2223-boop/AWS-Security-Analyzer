// ==========================================
// CYBERCHECK - LOGICA JS (script/app.js)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validatore URL
    window.analisaURL = function() {
        const urlInput = document.getElementById('url-input').value.trim();
        const result = document.getElementById('url-result');
        if (!urlInput) return;

        result.style.display = 'block';
        if (urlInput.startsWith('https://') && !urlInput.includes('pix') && !urlInput.includes('premio')) {
            result.className = 'result-box success';
            result.innerHTML = '🟢 <strong>Basso Rischio:</strong> Dominio protetto da HTTPS e privo di parole di phishing note.';
        } else {
            result.className = 'result-box danger';
            result.innerHTML = '🔴 <strong>Alto Rischio:</strong> Il link non usa HTTPS o contiene parole chiave sospette!';
        }
    };

    // 2. Verificatore Password
    window.analisaSenha = function() {
        const pass = document.getElementById('pass-input').value;
        const result = document.getElementById('pass-result');
        if (!pass) return;

        result.style.display = 'block';
        const forte = pass.length >= 12 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);

        if (forte) {
            result.className = 'result-box success';
            result.innerHTML = '🟢 <strong>Password Forte:</strong> Ottima combinazione di caratteri e lunghezza.';
        } else {
            result.className = 'result-box danger';
            result.innerHTML = '🔴 <strong>Password Debole:</strong> Usa almeno 12 caratteri con maiuscole, numeri e simboli.';
        }
    };

    // 3. Rilevatore Phishing E-mail / SMS
    window.analisaGolpe = function() {
        const text = document.getElementById('golpe-input').value.toLowerCase();
        const result = document.getElementById('golpe-result');
        if (!text) return;

        result.style.display = 'block';
        if (text.includes('bloqueado') || text.includes('clique') || text.includes('urgente') || text.includes('pix')) {
            result.className = 'result-box danger';
            result.innerHTML = '🚨 <strong>Possibile Truffa:</strong> Il messaggio utilizza leve psicologiche di urgenza e minaccia!';
        } else {
            result.className = 'result-box success';
            result.innerHTML = '🟢 <strong>Nessun campanello d\'allarme evidente:</strong> Verifica comunque il mittente reale.';
        }
    };

    // 5. Checklist Sicurezza
    window.atualizaChecklist = function() {
        const checkboxes = document.querySelectorAll('.check-item');
        let marcados = 0;
        checkboxes.forEach(chk => { if (chk.checked) marcados++; });
        const porcentagem = Math.round((marcados / checkboxes.length) * 100);

        document.getElementById('checklist-score').innerText = `La tua sicurezza: ${porcentagem}%`;
        document.getElementById('checklist-progress').style.width = `${porcentagem}%`;
    };
});