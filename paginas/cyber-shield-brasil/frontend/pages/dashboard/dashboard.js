function renderDashboard(data){

    const score =
    Number(data.score || 0);

    const grade =
    getGrade(score);

    const risk =
    getRisk(score);

    const findings =
    buildFindings(data);

    const recommendations =
    buildRecommendations(data);

    dashboard.innerHTML = `

        <!-- SCORE -->

        <div class="result-card">

            <div class="result-header">

                <div class="score-circle">

                    ${score}

                </div>

                <div class="score-details">

                    <h2>

                        Grade ${grade}

                    </h2>

                    <span class="risk-badge">

                        ${risk}

                    </span>

                </div>

            </div>

        </div>

        <!-- EXECUTIVE SUMMARY -->

        <div class="summary-card">

            <h2>

                Executive Summary

            </h2>

            <p>

                URL analisada:
                ${data.url || "N/A"}

            </p>

            <p>

                Score geral:
                ${score}

            </p>

            <p>

                Grade:
                ${grade}

            </p>

            <p>

                Foram identificados
                ${findings.length}
                ponto(s) de atenção.

            </p>

        </div>

        <!-- FINDINGS -->

        <div class="result-card">

            <h2>

                Findings

            </h2>

            <ul>

                ${findings.map(item => `
                    <li>
                        ⚠ ${item}
                    </li>
                `).join("")}

            </ul>

        </div>

        <!-- RECOMMENDATIONS -->

        <div class="result-card">

            <h2>

                Recommendations

            </h2>

            <ul>

                ${recommendations.map(item => `
                    <li>
                        ✅ ${item}
                    </li>
                `).join("")}

            </ul>

        </div>

    `;
}