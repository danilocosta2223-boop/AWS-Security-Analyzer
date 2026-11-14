async function loadDashboard() {

    const data = await fetch(
        "http://127.0.0.1:5000/api/dashboard/"
    )
    .then(response => response.json());

    console.log(data);

    document.getElementById(
        "totalScans"
    ).textContent =
        data.total_scans;

    document.getElementById(
        "totalReports"
    ).textContent =
        data.total_reports;

    document.getElementById(
        "latestScan"
    ).textContent =
        data.latest_scan;
}

loadDashboard();