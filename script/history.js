document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadHistory();

    }
);



async function loadHistory(){

    const container =
        document.getElementById(
            "history-container"
        );

    try{

        /*
            Futuramente virá da API:

            GET /api/history
        */

        const history = [

            {

                date:
                    "2026-11-04",

                target:
                    "google.com",

                score: 91,

                grade: "A",

                risk:
                    "LOW"

            },

            {

                date:
                    "2026-11-04",

                target:
                    "microsoft.com",

                score: 88,

                grade: "B",

                risk:
                    "LOW"

            },

            {

                date:
                    "2026-11-03",

                target:
                    "github.com",

                score: 82,

                grade: "B",

                risk:
                    "MEDIUM"

            },

            {

                date:
                    "2026-11-03",

                target:
                    "example.xyz",

                score: 49,

                grade: "F",

                risk:
                    "CRITICAL"

            }

        ];

        let html = `

        <table>

            <thead>

                <tr>

                    <th>Data</th>

                    <th>Host</th>

                    <th>Score</th>

                    <th>Grade</th>

                    <th>Risk</th>

                    <th>Ações</th>

                </tr>

            </thead>

            <tbody>

        `;

        history.forEach(item => {

            html += createRow(
                item
            );

        });

        html += `

            </tbody>

        </table>

        `;

        container.innerHTML =
            html;

    }

    catch(error){

        console.error(
            error
        );

        container.innerHTML =

        `
        <h2>
            Erro ao carregar histórico
        </h2>
        `;

    }

}



function createRow(
    item
){

    let riskClass =
        "risk-low";

    if(
        item.risk ===
        "MEDIUM"
    ){

        riskClass =
            "risk-medium";

    }

    if(
        item.risk ===
        "HIGH"
    ){

        riskClass =
            "risk-high";

    }

    if(
        item.risk ===
        "CRITICAL"
    ){

        riskClass =
            "risk-critical";

    }

    return `

        <tr>

            <td>

                ${item.date}

            </td>

            <td>

                ${item.target}

            </td>

            <td>

                ${item.score}

            </td>

            <td>

                ${item.grade}

            </td>

            <td>

                <span class="${riskClass}">

                    ${item.risk}

                </span>

            </td>

            <td>

                <button
                onclick="viewReport('${item.target}')">

                    Ver

                </button>

            </td>

        </tr>

    `;
}



function viewReport(
    target
){

    alert(

        `Abrindo relatório de ${target}`

    );

}