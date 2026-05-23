"""TMDB metadata proxy.

Thin pass-through to the daemon's `/admin/tmdb/*` lane — the daemon owns
the TMDB bearer token, the HTTP call to themoviedb.org, and the sqlite +
disk caches. This layer just translates URLs and passes bytes/JSON
through.

The split lives at the daemon because TMDB credentials are write-only in
`/admin/settings` (you cannot read them back), so FastAPI has no way to
authenticate to TMDB directly. Keeping the secret in one place also
means a credentials rotation is a single PUT, not a multi-service deploy.
"""

from fastapi import APIRouter, HTTPException, Query, Request, Response

from app.services import daemon_client

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


@router.get("/search")
async def search_tv(request: Request, q: str = Query(..., min_length=1)):
    """TMDB /search/tv. Returns the raw TMDB response; callers iterate
    `results[]` for {id, name, first_air_date, poster_path, overview, …}."""
    return await daemon_client.tmdb_search(request.app.state.daemon_client, q)


@router.get("/show/{tv_id}")
async def show(request: Request, tv_id: int):
    """TMDB /tv/{id} with external_ids appended (imdb_id lives there)."""
    return await daemon_client.tmdb_show(request.app.state.daemon_client, tv_id)


@router.get("/search/movie")
async def search_movie(request: Request, q: str = Query(..., min_length=1)):
    """TMDB /search/movie. Returns the raw TMDB response; callers iterate
    `results[]` for {id, title, release_date, poster_path, overview, …}."""
    return await daemon_client.tmdb_movie_search(request.app.state.daemon_client, q)


@router.get("/movie/{movie_id}")
async def movie(request: Request, movie_id: int):
    """TMDB /movie/{id} with external_ids appended."""
    return await daemon_client.tmdb_movie_show(request.app.state.daemon_client, movie_id)


@router.get("/search/album")
async def search_album(
    request: Request,
    album: str = Query(..., min_length=1, description="Release-group title"),
    artist: str = Query("", description="Artist credit; empty for album-only search"),
    year: int = Query(0, ge=0, description="firstreleasedate year filter; 0 = none"),
):
    """MusicBrainz /release-group?query=… proxy. Returns release-groups[]
    with id (MBID), title, first-release-date, artist-credit, etc."""
    return await daemon_client.mb_search(
        request.app.state.daemon_client, artist, album, year
    )


@router.get("/album/{mbid}")
async def album(request: Request, mbid: str):
    """MusicBrainz /release-group/{mbid} with artist-credits + releases."""
    return await daemon_client.mb_album(request.app.state.daemon_client, mbid)


@router.get("/album/guess/{info_hash}")
async def album_guess(request: Request, info_hash: str):
    """Picker seed: ask the daemon what it thinks the {artist, album, year}
    is for a torrent. If files are on disk the daemon scans embedded tags
    (clean signal); otherwise it parses the release name (best effort).
    Source/confidence in the response tell the UI which path was taken."""
    return await daemon_client.mb_guess(
        request.app.state.daemon_client, info_hash
    )


@router.get("/cover")
async def cover(request: Request, mbid: str = Query(..., description="Release-group MBID")):
    """Cover Art Archive front-cover JPEG for a release-group. 404 when the
    release-group has no archived cover."""
    bytes_data = await daemon_client.mb_cover(
        request.app.state.daemon_client, mbid
    )
    if not bytes_data:
        raise HTTPException(status_code=404, detail="cover art not found")
    return Response(content=bytes_data, media_type="image/jpeg")


@router.get("/poster")
async def poster(
    request: Request,
    path: str = Query(..., description="TMDB poster_path, e.g. /abc.jpg"),
    size: str = Query("w342", description="TMDB image size; w342 is fine for thumbnails"),
):
    """Fetch a poster JPEG. Bytes pass through as image/jpeg; cached on
    the daemon side keyed by (size, path)."""
    bytes_data = await daemon_client.tmdb_poster(
        request.app.state.daemon_client, path, size
    )
    if not bytes_data:
        raise HTTPException(status_code=404, detail="poster not found")
    return Response(content=bytes_data, media_type="image/jpeg")
