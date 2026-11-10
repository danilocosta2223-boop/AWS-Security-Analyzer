async function analyzeURL() {

    const url =
        document.getElementById(
            "urlInput"
        ).value;

    if (!url) {

        alert(
            "Digite uma URL."
        );

        return;
    }

    const response =
        await fetch(
            "/api/url-scan",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify({

                    url

                })

            }
        );

    const data =
        await response.json();

    document
        .getElementById("scanResult")
        .innerHTML = `

        <h3>Resultado</h3>

        <p><strong>Domínio:</strong>
        ${data.domain}</p>

        <p><strong>IP:</strong>
        ${data.ip}</p>

        <p><strong>HTTPS:</strong>
        ${data.https}</p>

        <p><strong>Risco:</strong>
        ${data.risk}</p>

        <p><strong>Score:</strong>
        ${data.score}</p>

    `;
}