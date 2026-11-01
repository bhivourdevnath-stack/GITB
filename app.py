import math
import json
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, render_template, request

app = Flask(__name__)
DATA_DIR = Path(app.root_path) / "data"


def load_json(filename):
    try:
        with (DATA_DIR / filename).open("r", encoding="utf-8") as file:
            data = json.load(file)
        if not isinstance(data, list):
            raise ValueError(f"{filename} must contain a JSON array")
        return data
    except (OSError, json.JSONDecodeError, ValueError) as error:
        app.logger.warning("Could not load catalog %s: %s", filename, error)
        return []


REQUIRED_RESOURCE_FIELDS = {
    "id", "name", "url", "type", "category", "tags", "description", "featured", "status"
}


def valid_resource(resource):
    parsed = urlparse(resource.get("url", ""))
    return (
        parsed.scheme in {"http", "https"}
        and bool(parsed.netloc)
        and " " not in parsed.netloc
    )


def validate_catalog():
    categories = load_json("categories.json")
    games = load_json("games.json")
    websites = load_json("websites.json")
    category_ids = [category["id"] for category in categories if isinstance(category, dict) and category.get("id")]
    resources = games + websites
    errors = []

    if len(category_ids) != len(set(category_ids)):
        errors.append("Category IDs must be unique")

    for category in categories:
        if not isinstance(category, dict):
            errors.append("Every category must be an object")
        elif not {"id", "name", "icon", "order"}.issubset(category):
            errors.append(f"Category {category.get('id', '<unknown>')} is missing required fields")
        elif not isinstance(category["order"], int):
            errors.append(f"Category {category.get('id', '<unknown>')} order must be an integer")

    ids = [resource.get("id") for resource in resources if isinstance(resource, dict)]
    if len(ids) != len(set(ids)):
        errors.append("Resource IDs must be unique")

    for resource in resources:
        if not isinstance(resource, dict):
            errors.append("Every catalog resource must be an object")
            continue
        missing = REQUIRED_RESOURCE_FIELDS - resource.keys()
        if missing:
            errors.append(f"{resource.get('id', '<unknown>')} is missing: {', '.join(sorted(missing))}")
        if not isinstance(resource.get("tags"), list) or not all(isinstance(tag, str) for tag in resource.get("tags", [])):
            errors.append(f"{resource.get('id', '<unknown>')} tags must be a string list")
        if not isinstance(resource.get("featured"), bool):
            errors.append(f"{resource.get('id', '<unknown>')} featured must be a boolean")
        if resource.get("type") not in {"game", "website"}:
            errors.append(f"{resource.get('id', '<unknown>')} has an invalid type")
        if resource.get("status") not in {"active", "unverified"}:
            errors.append(f"{resource.get('id', '<unknown>')} has an invalid status")
        if resource.get("category") not in category_ids:
            errors.append(f"{resource.get('id', '<unknown>')} has an unknown category")
        if not valid_resource(resource):
            errors.append(f"{resource.get('id', '<unknown>')} has an invalid URL")

    for game in games:
        if isinstance(game, dict) and game.get("type") != "game":
            errors.append(f"{game.get('id', '<unknown>')} should be stored in games.json as a game")
    for website in websites:
        if isinstance(website, dict) and website.get("type") != "website":
            errors.append(f"{website.get('id', '<unknown>')} should be stored in websites.json as a website")

    if errors:
        raise ValueError("Invalid GITB catalog: " + "; ".join(errors))
    return games, websites, categories


def load_resources():
    games, websites, _ = validate_catalog()
    return games + websites


def load_catalog_safely():
    try:
        return validate_catalog()
    except (ValueError, TypeError, KeyError) as error:
        app.logger.warning("Catalog validation failed: %s", error)
        return [], [], []


@app.route("/")
def index():
    games, websites, categories = load_catalog_safely()
    resources = games + websites
    featured = [resource for resource in resources if resource.get("featured")]
    category_names = {category["id"]: category["name"] for category in categories}
    collections = []
    for category in categories:
        category_resources = [
            resource for resource in resources
            if resource.get("category") == category["id"] and resource.get("type") == "game"
        ][:6]
        if category_resources:
            collections.append({
                "id": category["id"],
                "name": category["name"],
                "resources": category_resources,
            })
    return render_template(
        "index.html",
        featured_resources=featured[:6],
        categories=categories,
        category_names=category_names,
        collections=collections,
    )


@app.route("/directory")
def directory():
    games, websites, categories = load_catalog_safely()
    resources = games + websites
    categories.sort(key=lambda item: item["order"])
    query = request.args.get("q", "", type=str).strip()
    resource_type = request.args.get("type", "all").strip().lower()
    category = request.args.get("category", "all").strip().lower()

    type_aliases = {"games": "game", "websites": "website"}
    resource_type = type_aliases.get(resource_type, resource_type)
    valid_types = {"all", "game", "website"}
    valid_categories = {"all", *(item["id"] for item in categories)}
    if resource_type not in valid_types:
        resource_type = "all"
    if category not in valid_categories:
        category = "all"

    category_names = {item["id"]: item["name"] for item in categories}
    filtered = []
    for resource in resources:
        category_id = resource.get("category", "")
        searchable = " ".join([
            resource.get("name", ""),
            resource.get("description", ""),
            resource.get("url", ""),
            category_id,
            category_names.get(category_id, ""),
            " ".join(resource.get("tags", [])),
        ]).lower()
        normalized_query = query.lower()
        type_matches = resource_type == "all" or resource.get("type") == resource_type
        category_matches = category == "all" or resource.get("category") == category
        search_matches = not normalized_query or normalized_query in searchable
        if type_matches and category_matches and search_matches:
            filtered.append(resource)

    grouped = []
    for category_item in categories:
        category_resources = [item for item in filtered if item.get("category") == category_item["id"]]
        if category_resources:
            if category == "all":
                grouped.append({
                    "id": category_item["id"],
                    "name": category_item["name"],
                    "resources": category_resources[:20],
                    "show_all": True,
                })

    page = request.args.get("page", 1, type=int)
    if page < 1:
        page = 1

    pagination = None
    if category != "all":
        category_resources = [
            item for item in filtered if item.get("category") == category
        ]
        page_size = 100
        show_all = request.args.get("show_all") == "1"
        if show_all:
            start = 0
            end = len(category_resources)
        else:
            total_pages = max(1, math.ceil(len(category_resources) / page_size))
            page = min(page, total_pages)
            start = (page - 1) * page_size
            end = start + page_size
        category_name = category_names.get(category, category)
        grouped = [{
            "id": category,
            "name": category_name,
            "resources": category_resources[start:end],
            "show_all": False,
        }] if category_resources else []
        if not show_all:
            pagination = {
                "page": page,
                "pages": total_pages,
                "has_prev": page > 1,
                "has_next": page < total_pages,
            }

    return render_template(
        "directory.html",
        categories=categories,
        grouped_resources=grouped,
        query=query,
        resource_type=resource_type,
        category=category,
        page=page,
        pagination=pagination,
    )


@app.route("/contribute")
def contribute():
    return render_template("contribute.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/health")
def health():
    return {"status": "ok"}


@app.errorhandler(404)
def not_found(error):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
