async function checkPassword() {

    const password =
        document
            .getElementById("passwordInput")
            .value;

    if (!password) {

        alert(
            "Digite uma senha."
        );

        return;

    }

    const response =
        await fetch(
            "/api/password-check",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify({

                    password

                })

            }
        );

    const data =
        await response.json();

    document
        .getElementById(
            "passwordResult"
        )
        .innerHTML = `

        <h3>Resultado</h3>

        <p>
        <strong>Nível:</strong>
        ${data.level}
        </p>

        <p>
        <strong>Score:</strong>
        ${data.score}/100
        </p>

        <p>
        <strong>Tamanho:</strong>
        ${data.length}
        </p>

        <p>
        <strong>Melhorias:</strong>
        ${data.issues.join(", ")}
        </p>

        `;

}