import requests
import urllib.parse
import xml.etree.ElementTree as ET
import re
import html


# ============================================================
# CONFIGURACIÓN
# ============================================================

USER_AGENT = "Erly/1.2 Personal Assistant"


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def clean_text(text):

    if not text:
        return ""

    text = html.unescape(text)

    text = re.sub(
        r"<[^>]+>",
        "",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# WIKIPEDIA
# ============================================================

def wikipedia_search(query):

    try:

        headers = {
            "User-Agent": USER_AGENT
        }

        # ----------------------------------------------------
        # Buscar artículo
        # ----------------------------------------------------

        search_url = (
            "https://es.wikipedia.org/w/api.php"
        )

        params = {

            "action": "query",

            "list": "search",

            "srsearch": query,

            "format": "json",

            "utf8": 1,

            "srlimit": 3

        }

        response = requests.get(
            search_url,
            params=params,
            headers=headers,
            timeout=15
        )

        response.raise_for_status()

        data = response.json()

        results = data.get(
            "query",
            {}
        ).get(
            "search",
            []
        )


        if not results:

            return None


        title = results[0].get(
            "title"
        )


        if not title:

            return None


        # ----------------------------------------------------
        # Obtener resumen
        # ----------------------------------------------------

        encoded_title = urllib.parse.quote(
            title
        )

        summary_url = (
            "https://es.wikipedia.org/api/rest_v1/page/summary/"
            + encoded_title
        )


        summary_response = requests.get(
            summary_url,
            headers=headers,
            timeout=15
        )


        if summary_response.status_code != 200:

            return (
                f"Wikipedia encontró: {title}"
            )


        summary_data = (
            summary_response.json()
        )


        extract = summary_data.get(
            "extract",
            ""
        )


        extract = clean_text(
            extract
        )


        if not extract:

            return (
                f"Wikipedia encontró: {title}"
            )


        return (
            f"{title}: {extract}"
        )


    except Exception as error:

        print(
            "ERROR EN WIKIPEDIA:",
            error
        )

        return None


# ============================================================
# NOTICIAS
# ============================================================

def news_search(query):

    try:

        encoded_query = urllib.parse.quote(
            query
        )

        rss_url = (
            "https://news.google.com/rss/search?"
            f"q={encoded_query}"
            "&hl=es-419"
            "&gl=US"
            "&ceid=US:es"
        )


        headers = {
            "User-Agent": USER_AGENT
        }


        response = requests.get(
            rss_url,
            headers=headers,
            timeout=15
        )


        response.raise_for_status()


        root = ET.fromstring(
            response.content
        )


        articles = []


        for item in root.findall(
            ".//item"
        ):

            title = item.findtext(
                "title"
            )

            link = item.findtext(
                "link"
            )

            pub_date = item.findtext(
                "pubDate"
            )


            if not title:

                continue


            title = clean_text(
                title
            )


            article = (
                f"- {title}"
            )


            if pub_date:

                article += (
                    f" ({pub_date})"
                )


            if link:

                article += (
                    f"\n  Fuente: {link}"
                )


            articles.append(
                article
            )


            if len(articles) >= 5:

                break


        if not articles:

            return (
                "No encontré noticias recientes "
                "para esa búsqueda."
            )


        return (
            "\n".join(articles)
        )


    except Exception as error:

        print(
            "ERROR EN NOTICIAS:",
            error
        )

        return None