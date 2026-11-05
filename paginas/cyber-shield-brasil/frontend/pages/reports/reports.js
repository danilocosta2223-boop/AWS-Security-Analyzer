document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadReports();

    }
);



async function loadReports(){

    const container =
        document.getElementById(
            "reports-container"
        );

    try{

        /*
            Futuramente virá da API:

            GET /api/reports
        */

        const reports = [

            {

                target:
                    "google.com",

                score: 91,

                grade: "A",

                date:
                    "2026-11-04",

                format:
                    "PDF"

            },

            {

                target:
                    "github.com",

                score: 86,

                grade: "B",

                date:
                    "2026-11-03",

                format:
                    "PDF"

            },

            {

                target:
                    "microsoft.com",

                score: 94,

                grade: "A",

                date:
                    "2026-11-02",

                format:
                    "PDF"

            }

        ];

        let html = "";

        reports.forEach(report => {

            html += createReportCard(
                report
            );

        });

        container.innerHTML = html;

    }

    catch(error){

        console.error(
            error
        );

        container.innerHTML = `

            <h2>
                Erro ao carregar relatórios
            </h2>

        `;

    }

}



function createReportCard(
    report
){

    return `

        <div class="report-card">

            <h3>

                🌐 ${report.target}

            </h3>

            <p>

                Data:
                ${report.date}

            </p>

            <p>

                Score:
                ${report.score}

            </p>

            <p>

                Grade:
                ${report.grade}

            </p>

            <p>

                Formato:
                ${report.format}

            </p>

            <div class="buttons">

                <button
                    onclick="downloadPDF('${report.target}')">

                    📄 PDF

                </button>

                <button
                    onclick="downloadJSON('${report.target}')">

                    📦 JSON

                </button>

                <button
                    onclick="downloadCSV('${report.target}')">

                    📊 CSV

                </button>

            </div>

        </div>

    `;
}



function downloadPDF(
    target
){

    alert(

        `Download PDF: ${target}`

    );

}



function downloadJSON(
    target
){

    alert(

        `Download JSON: ${target}`

    );

}



function downloadCSV(
    target
){

    alert(

        `Download CSV: ${target}`

    );

}