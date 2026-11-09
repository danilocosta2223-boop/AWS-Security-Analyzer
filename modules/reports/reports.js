async function generateReport() {

    const payload = {

        target:
        document.getElementById(
            "reportTarget"
        ).value

    };

    const response =
        await fetch(
            "/api/report",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify(
                    payload
                )

            }
        );

    const data =
        await response.json();

    document
        .getElementById(
            "reportResult"
        )
        .innerHTML = `

        <h3>Relatório Gerado</h3>

        <pre>

${JSON.stringify(
    data,
    null,
    4
)}

        </pre>

        `;
}