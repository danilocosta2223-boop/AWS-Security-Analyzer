def shodan_lookup(target):

    result = {

        "success": True,

        "target": target,

        "organization": "Simulation Environment",

        "country": "Brazil",

        "open_ports": [

            80,
            443

        ],

        "services": [

            "HTTP",
            "HTTPS"

        ],

        "risk": "Baixo"

    }

    target = str(target).lower()

    suspicious_targets = [

        "admin",
        "test",
        "dev",
        "root"

    ]

    for word in suspicious_targets:

        if word in target:

            result["risk"] = "Médio"

    return result
