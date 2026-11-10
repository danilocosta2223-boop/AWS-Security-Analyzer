import ipaddress
import socket


def analyze_ip(ip):

    result = {

        "success": True,

        "ip": ip,

        "valid": False,

        "version": None,

        "private": False,

        "loopback": False,

        "multicast": False,

        "reserved": False,

        "hostname": None,

        "risk": "unknown"

    }

    try:

        ip_obj = ipaddress.ip_address(ip)

        result["valid"] = True

        result["version"] = ip_obj.version

        result["private"] = ip_obj.is_private

        result["loopback"] = ip_obj.is_loopback

        result["multicast"] = ip_obj.is_multicast

        result["reserved"] = ip_obj.is_reserved

        try:

            hostname = socket.gethostbyaddr(ip)[0]

            result["hostname"] = hostname

        except Exception:

            result["hostname"] = "Não encontrado"

        if ip_obj.is_private:

            result["risk"] = "Baixo"

        elif ip_obj.is_loopback:

            result["risk"] = "Baixo"

        else:

            result["risk"] = "Médio"

        return result

    except Exception as error:

        return {

            "success": False,

            "message": str(error)

        }