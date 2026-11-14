async function loadReports() {

    const data = await fetch(
        "http://127.0.0.1:5000/api/reports/"
    )
    .then(response => response.json());

    console.log(data);
}

loadReports();