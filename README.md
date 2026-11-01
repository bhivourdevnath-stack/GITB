# GITB — Games in the browser

GITB is a curated directory for discovering browser games and websites that provide browser games. It is a lightweight Flask application and does not host or embed games.

## Requirements

- Python 3.10 or newer

## Local development

Create and activate a virtual environment:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies and run the app:

```powershell
python -m pip install -r requirements.txt
flask --app app run --debug
```

Then open `http://127.0.0.1:5000`.

## Catalog format

Add games to `data/games.json` and game portals or resource websites to `data/websites.json`. Every resource uses this schema:

```json
{
  "id": "stable-unique-id",
  "name": "Display name",
  "url": "https://example.com",
  "type": "game",
  "category": "puzzle",
  "tags": ["Puzzle", "Casual"],
  "description": "A short factual description.",
  "featured": false,
  "status": "active"
}
```

Use `game` or `website` for `type`, use a category ID defined in `data/categories.json`, and use either `active` or `unverified` for `status`. Resource IDs must be unique across both catalog files, and URLs must use HTTP or HTTPS.

## Contributing

The contribution workflow uses GitHub Issues and pull requests on the [GITB repository](https://github.com/bhivourdevnath-stack/GameLink).

### Suggest a resource or report a broken link

- Nontechnical contributors can open the direct [game link submission form](https://github.com/bhivourdevnath-stack/GameLink/issues/new?template=suggest-resource.yml) for a new game or website.
- Open a [broken-link report](https://github.com/bhivourdevnath-stack/GameLink/issues/new?template=broken-link.yml) if an existing catalog URL no longer works.
- Search the directory and existing issues before submitting so duplicate reports can be avoided.

### Edit the catalog with a pull request

1. Fork the repository and create a focused branch.
2. Put games in `data/games.json` and game portals or resource websites in `data/websites.json`.
3. Use the schema above, including a stable unique ID and a category ID from `data/categories.json`.
4. Keep descriptions short and factual, and use an HTTP or HTTPS canonical URL.
5. Run `python -m pytest` before committing.
6. Push the branch and open a pull request targeting `main`.

Maintainers review submissions for a valid URL, duplicate entries, the correct category, a useful description, and safety. Approval is required before a pull request is merged, and opening an issue does not update the live catalog automatically.

## Project layout

- `app.py` — Flask application and routes
- `templates/` — Jinja templates
- `static/` — CSS, JavaScript, and images
- `data/` — JSON catalog data
- `tests/` — automated tests
## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
