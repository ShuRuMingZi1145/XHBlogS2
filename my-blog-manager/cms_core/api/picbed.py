from fastapi import APIRouter, Body, UploadFile, File, Form
import httpx

router = APIRouter()


# ────────────────────── 图床类型识别 ──────────────────────

def _detect_provider(url: str) -> str:
    url_lower = url.lower()
    if "sm.ms" in url_lower or "s.ee" in url_lower:
        return "smms"
    if "scdn.io" in url_lower or "scdn" in url_lower:
        return "scdn"
    return "lsky"


# ────────────────────── 测试连接 ──────────────────────

@router.post("/test")
async def test_picbed_connection(payload: dict = Body(...)):
    url = payload.get("url", "").strip().rstrip('/')
    token = payload.get("token", "").strip()

    if not url:
        return {"success": False, "message": "图床 API 地址不能为空"}

    provider = _detect_provider(url)

    if provider == "scdn":
        return {"success": True, "message": "scdn.io 无需 Token，保存配置后即可上传"}

    if not token:
        return {"success": False, "message": "该图床需要 Token"}

    if provider == "smms":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get("https://s.ee/api/v1/usage", headers={"Authorization": token})
                if res.status_code == 200:
                    return {"success": True, "message": "S.EE 连接成功"}
                return {"success": True, "message": "S.EE 可用，请保存配置后上传图片验证"}
        except Exception:
            return {"success": True, "message": "S.EE 可用，请保存配置后上传图片验证"}

    test_endpoint = f"{url}/api/v1/profile"
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    headers = {"Authorization": token, "Accept": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(test_endpoint, headers=headers)
            if response.status_code != 200:
                return {"success": False, "message": f"校验失败，服务器返回了 {response.status_code} 错误"}

            data = response.json()
            if data.get("status") is True:
                user_email = data.get("data", {}).get("email", "未知用户")
                return {"success": True, "message": f"连接成功！当前账户: {user_email}"}
            else:
                return {"success": False, "message": f"Token 无效: {data.get('message', '未知错误')}"}
    except Exception as e:
        return {"success": False, "message": f"网络异常: {str(e)}"}


# ────────────────────── 上传 ──────────────────────

@router.post("/upload")
async def upload_image(
        file: UploadFile = File(...),
        url: str = Form(...),
        token: str = Form(...)
):
    url = url.strip().rstrip('/')
    token = token.strip()

    provider = _detect_provider(url)
    if provider == "smms":
        return await _upload_smms(file, token)
    if provider == "scdn":
        return await _upload_scdn(file)
    return await _upload_lsky(file, url, token)


# ────────────────────── SM.MS ──────────────────────

async def _upload_smms(file: UploadFile, token: str):
    endpoint = "https://s.ee/api/v1/file/upload"
    headers = {"Authorization": token, "Accept": "application/json"}

    try:
        content = await file.read()
        files = {"smfile": (file.filename, content, file.content_type)}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, headers=headers, files=files)
            data = response.json()

            if data.get("success"):
                img_url = data.get("data", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}

            if data.get("code") == "image_repeated":
                img_url = data.get("images")
                if img_url:
                    return {"success": True, "message": "图片已存在", "url": img_url}

            return {"success": False, "message": f"图床拒绝: {data.get('message', '未知')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}


# ────────────────────── scdn.io ──────────────────────

async def _upload_scdn(file: UploadFile):
    endpoint = "https://img.scdn.io/api/v1.php"

    try:
        content = await file.read()
        files = {"image": (file.filename, content, file.content_type)}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, files=files)
            data = response.json()

            if data.get("success"):
                img_url = data.get("url") or data.get("data", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}

            return {"success": False, "message": f"上传失败: {data.get('message', '未知')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}


# ────────────────────── Lsky Pro ──────────────────────

async def _upload_lsky(file: UploadFile, url: str, token: str):
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"

    upload_endpoint = f"{url}/api/v1/upload"
    headers = {"Authorization": token, "Accept": "application/json"}

    try:
        content = await file.read()
        files = {"file": (file.filename, content, file.content_type)}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(upload_endpoint, headers=headers, files=files)

            if response.status_code != 200:
                return {"success": False, "message": f"上传失败，图床返回了 {response.status_code} 错误"}

            data = response.json()
            if data.get("status") is True:
                img_url = data.get("data", {}).get("links", {}).get("url")
                return {"success": True, "message": "上传成功", "url": img_url}
            else:
                return {"success": False, "message": f"图床拒绝接收: {data.get('message', '未知')}"}
    except httpx.ReadTimeout:
        return {"success": False, "message": "图片上传超时，请检查网络或图片是否过大"}
    except Exception as e:
        return {"success": False, "message": f"服务器异常: {str(e)}"}