# NEPSE backend collector

`nepse_scraper.py` is the continuous collector for a real backend/VPS. It refreshes market JSON every 30 seconds during the Nepal trading window and refreshes company/reference datasets every 15 minutes.

## Run

```bash
python3 backend/nepse_scraper.py
```

## Production with systemd

Copy `backend/nepse-scraper.service` to `/etc/systemd/system/`, adjust `WorkingDirectory` and paths, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nepse-scraper
sudo journalctl -u nepse-scraper -f
```

## Data

The collector writes to `data/nepse/` and atomically replaces JSON files. The website can therefore read stable JSON snapshots. `meta.json` records the last successful update and source information.

## Important accuracy note

There is no documented public NEPSE streaming API that this project can honestly label as an official 30-second API. The structured machine-readable feed used here is the published YONEPSE dataset derived from NEPSE data. The official NEPSE site is retained as the official reference. The collector never fabricates missing values.

GitHub Actions cannot reliably commit a repository change every 30 seconds; that would also create an excessive number of Git commits. For true 30-second backend updates, run this collector continuously on a VPS/server and deploy the resulting `data/nepse/*.json` directory to the website. The existing GitHub Action remains useful for periodic repository snapshots.
