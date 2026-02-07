from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import csv
import re
from cachetools import TTLCache

# Import expanded chemical dictionaries (1707 CAS entries, 1816 English entries)
from chemical_dict import CAS_TO_ZH, CAS_TO_EN, CHEMICAL_NAMES_ZH_EXPANDED

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


APP_VERSION = "1.2.0"

# Shared httpx client (initialized in lifespan)
shared_http_client: Optional[httpx.AsyncClient] = None

# In-memory caches (TTL = 24 hours, max 5000 entries each)
cid_cache: TTLCache = TTLCache(maxsize=5000, ttl=86400)
ghs_cache: TTLCache = TTLCache(maxsize=5000, ttl=86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    global shared_http_client
    shared_http_client = httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
    )
    yield
    # Shutdown
    await shared_http_client.aclose()

# Create the main app with lifespan
app = FastAPI(title="GHS Label Quick Search API", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# GHS Pictogram mapping
GHS_PICTOGRAMS = {
    "GHS01": {"name": "Explosive", "name_zh": "爆炸物", "icon": "💥", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS01.svg"},
    "GHS02": {"name": "Flammable", "name_zh": "易燃物", "icon": "🔥", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg"},
    "GHS03": {"name": "Oxidizer", "name_zh": "氧化劑", "icon": "⭕", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS03.svg"},
    "GHS04": {"name": "Compressed Gas", "name_zh": "壓縮氣體", "icon": "🫧", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS04.svg"},
    "GHS05": {"name": "Corrosive", "name_zh": "腐蝕性", "icon": "🧪", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS05.svg"},
    "GHS06": {"name": "Toxic", "name_zh": "劇毒", "icon": "💀", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS06.svg"},
    "GHS07": {"name": "Irritant", "name_zh": "刺激性/有害", "icon": "⚠️", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg"},
    "GHS08": {"name": "Health Hazard", "name_zh": "健康危害", "icon": "🫁", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS08.svg"},
    "GHS09": {"name": "Environmental Hazard", "name_zh": "環境危害", "icon": "🐟", "image": "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS09.svg"},
}

# H-code Chinese translations
H_CODE_TRANSLATIONS = {
    "H200": "不穩定爆炸物",
    "H201": "爆炸物；整體爆炸危險",
    "H202": "爆炸物；嚴重拋射危險",
    "H203": "爆炸物；火災、爆炸或拋射危險",
    "H204": "火災或拋射危險",
    "H205": "遇火可能整體爆炸",
    "H220": "極易燃氣體",
    "H221": "易燃氣體",
    "H222": "極易燃氣溶膠",
    "H223": "易燃氣溶膠",
    "H224": "極易燃液體和蒸氣",
    "H225": "高度易燃液體和蒸氣",
    "H226": "易燃液體和蒸氣",
    "H227": "可燃液體",
    "H228": "易燃固體",
    "H229": "壓力容器：遇熱可能爆裂",
    "H230": "可能以爆炸方式反應，即使沒有空氣",
    "H231": "在高壓/高溫下可能以爆炸方式反應，即使沒有空氣",
    "H240": "遇熱可能爆炸",
    "H241": "遇熱可能起火或爆炸",
    "H242": "遇熱可能起火",
    "H250": "暴露在空氣中會自燃",
    "H251": "自熱；可能起火",
    "H252": "大量堆積時自熱；可能起火",
    "H260": "遇水放出易燃氣體，可能自燃",
    "H261": "遇水放出易燃氣體",
    "H270": "可能導致或加劇燃燒；氧化劑",
    "H271": "可能引起燃燒或爆炸；強氧化劑",
    "H272": "可能加劇燃燒；氧化劑",
    "H280": "內含高壓氣體；遇熱可能爆炸",
    "H281": "內含冷凍氣體；可能造成低溫灼傷",
    "H290": "可能腐蝕金屬",
    "H300": "吞食致命",
    "H301": "吞食有毒",
    "H302": "吞食有害",
    "H303": "吞食可能有害",
    "H304": "吞食並進入呼吸道可能致命",
    "H305": "吞食並進入呼吸道可能有害",
    "H310": "皮膚接觸致命",
    "H311": "皮膚接觸有毒",
    "H312": "皮膚接觸有害",
    "H313": "皮膚接觸可能有害",
    "H314": "造成嚴重皮膚灼傷和眼睛損傷",
    "H315": "造成皮膚刺激",
    "H316": "造成輕微皮膚刺激",
    "H317": "可能造成皮膚過敏反應",
    "H318": "造成嚴重眼睛損傷",
    "H319": "造成嚴重眼睛刺激",
    "H320": "造成眼睛刺激",
    "H330": "吸入致命",
    "H331": "吸入有毒",
    "H332": "吸入有害",
    "H333": "吸入可能有害",
    "H334": "吸入可能導致過敏或哮喘症狀或呼吸困難",
    "H335": "可能造成呼吸道刺激",
    "H336": "可能造成昏睡或頭暈",
    "H340": "可能導致遺傳性缺陷",
    "H341": "懷疑會導致遺傳性缺陷",
    "H350": "可能致癌",
    "H351": "懷疑會致癌",
    "H360": "可能損害生育能力或胎兒",
    "H361": "懷疑會損害生育能力或胎兒",
    "H362": "可能對哺乳兒童造成傷害",
    "H370": "會對器官造成損害",
    "H371": "可能會對器官造成損害",
    "H372": "長期或反覆暴露會對器官造成損害",
    "H373": "長期或反覆暴露可能會對器官造成損害",
    "H400": "對水生生物毒性非常大",
    "H401": "對水生生物有毒",
    "H402": "對水生生物有害",
    "H410": "對水生生物毒性非常大並具有長期持續影響",
    "H411": "對水生生物有毒並具有長期持續影響",
    "H412": "對水生生物有害並具有長期持續影響",
    "H413": "可能對水生生物造成長期持續有害影響",
    "H420": "破壞高層大氣中的臭氧，危害公眾健康和環境",
}

# Pre-computed cleaned-name index for O(1) fuzzy lookups (built once at startup)
_CLEAN_NAME_INDEX: Dict[str, str] = {}
for _en_name, _zh_name in CHEMICAL_NAMES_ZH_EXPANDED.items():
    _clean = re.sub(r'[^a-z0-9]', '', _en_name)
    _CLEAN_NAME_INDEX[_clean] = _zh_name

# Define Models
class CASQuery(BaseModel):
    cas_numbers: List[str] = Field(..., max_length=100)

class GHSReport(BaseModel):
    """Single GHS classification report"""
    pictograms: List[Dict[str, Any]] = []
    hazard_statements: List[Dict[str, str]] = []
    signal_word: Optional[str] = None
    signal_word_zh: Optional[str] = None
    source: Optional[str] = None
    report_count: Optional[str] = None

class ChemicalResult(BaseModel):
    cas_number: str
    cid: Optional[int] = None
    name_en: Optional[str] = None
    name_zh: Optional[str] = None
    # Primary (main) classification - first/most reported
    ghs_pictograms: List[Dict[str, Any]] = []
    hazard_statements: List[Dict[str, str]] = []
    signal_word: Optional[str] = None
    signal_word_zh: Optional[str] = None
    # Other classification reports
    other_classifications: List[GHSReport] = []
    has_multiple_classifications: bool = False
    found: bool = False
    error: Optional[str] = None

class ExportRequest(BaseModel):
    results: List[Dict[str, Any]]
    format: str = "xlsx"  # xlsx or csv

# Helper functions
def normalize_cas(cas: str) -> str:
    """Normalize CAS number format"""
    cas = cas.strip()
    # Remove common prefixes
    cas = re.sub(r'^CAS[:\s-]*', '', cas, flags=re.IGNORECASE)
    # Keep only digits and hyphens
    cas = re.sub(r'[^\d-]', '', cas)
    
    # Try to fix common format issues
    if cas:
        parts = cas.split('-')
        if len(parts) == 3:
            # Remove leading zeros from first part
            parts[0] = parts[0].lstrip('0') or '0'
            # Remove leading zeros from last part (check digit should be single digit)
            parts[2] = parts[2].lstrip('0') or '0'
            # Ensure middle part has 2 digits
            if len(parts[1]) == 1:
                parts[1] = '0' + parts[1]
            cas = '-'.join(parts)
        elif len(parts) == 1 and len(cas) >= 5:
            # Try to parse CAS without hyphens (e.g., 6417-5 or 64175)
            digits = re.sub(r'[^0-9]', '', cas)
            if len(digits) >= 5:
                # CAS format: XXXXXX-XX-X
                check = digits[-1]
                middle = digits[-3:-1]
                first = digits[:-3].lstrip('0') or '0'
                cas = f"{first}-{middle}-{check}"
    
    return cas

def extract_all_ghs_classifications(ghs_data: dict) -> List[Dict[str, Any]]:
    """
    Extract ALL GHS classification reports from PubChem data.
    Returns a list of classification reports, each containing pictograms, hazards, signal word, and source.
    The first report is typically the primary/most common classification.
    """
    reports = []
    
    try:
        sections = ghs_data.get("Record", {}).get("Section", [])
        for section in sections:
            if section.get("TOCHeading") == "Safety and Hazards":
                for subsection in section.get("Section", []):
                    if subsection.get("TOCHeading") == "Hazards Identification":
                        for subsubsection in subsection.get("Section", []):
                            if subsubsection.get("TOCHeading") == "GHS Classification":
                                # Parse each report entry
                                current_report = None
                                
                                for info in subsubsection.get("Information", []):
                                    info_name = info.get("Name", "")
                                    
                                    if info_name == "Pictogram(s)":
                                        # Start a new report when we encounter Pictogram(s)
                                        if current_report is not None:
                                            reports.append(current_report)
                                        
                                        current_report = {
                                            "pictograms": [],
                                            "hazard_statements": [],
                                            "signal_word": None,
                                            "signal_word_zh": None,
                                            "source": None,
                                            "report_count": None
                                        }
                                        
                                        # Extract pictogram codes
                                        seen_codes = set()
                                        for markup in info.get("Value", {}).get("StringWithMarkup", []):
                                            for extra in markup.get("Markup", []):
                                                if extra.get("Type") == "Icon":
                                                    url = extra.get("URL", "")
                                                    match = re.search(r'(GHS\d{2})', url)
                                                    if match:
                                                        pic_code = match.group(1)
                                                        if pic_code in GHS_PICTOGRAMS and pic_code not in seen_codes:
                                                            seen_codes.add(pic_code)
                                                            current_report["pictograms"].append({
                                                                "code": pic_code,
                                                                **GHS_PICTOGRAMS[pic_code]
                                                            })
                                    
                                    elif info_name == "Signal" and current_report is not None:
                                        signal_translations = {"Danger": "危險", "Warning": "警告"}
                                        for markup in info.get("Value", {}).get("StringWithMarkup", []):
                                            signal = markup.get("String", "")
                                            if signal:
                                                current_report["signal_word"] = signal
                                                current_report["signal_word_zh"] = signal_translations.get(signal, signal)
                                                break
                                    
                                    elif info_name == "GHS Hazard Statements" and current_report is not None:
                                        seen_codes = set()
                                        for markup in info.get("Value", {}).get("StringWithMarkup", []):
                                            text = markup.get("String", "")
                                            h_match = re.search(r'(H\d{3})', text)
                                            if h_match:
                                                h_code = h_match.group(1)
                                                if h_code not in seen_codes:
                                                    seen_codes.add(h_code)
                                                    zh_text = H_CODE_TRANSLATIONS.get(h_code, "")
                                                    current_report["hazard_statements"].append({
                                                        "code": h_code,
                                                        "text_en": text,
                                                        "text_zh": zh_text if zh_text else text
                                                    })
                                    
                                    elif info_name == "ECHA C&L Notifications Summary" and current_report is not None:
                                        for markup in info.get("Value", {}).get("StringWithMarkup", []):
                                            text = markup.get("String", "")
                                            if text:
                                                current_report["source"] = text
                                                # Extract report count if available
                                                count_match = re.search(r'(\d+)\s*report', text.lower())
                                                if count_match:
                                                    current_report["report_count"] = count_match.group(1)
                                                break
                                
                                # Don't forget the last report
                                if current_report is not None:
                                    reports.append(current_report)
    
    except Exception as e:
        logger.error(f"Error extracting GHS classifications: {e}")
    
    # Filter out empty reports
    reports = [r for r in reports if r.get("pictograms")]
    
    return reports


def get_chinese_name_from_cas(cas_number: str) -> Optional[str]:
    """Get Chinese name directly from CAS number (most accurate method)"""
    if not cas_number:
        return None
    cas_normalized = cas_number.strip()
    
    # Direct CAS lookup - highest priority
    if cas_normalized in CAS_TO_ZH:
        return CAS_TO_ZH[cas_normalized]
    
    return None

def get_english_name_from_cas(cas_number: str) -> Optional[str]:
    """Get English name from CAS number via local dictionary"""
    if not cas_number:
        return None
    cas_normalized = cas_number.strip()
    
    # Direct lookup from CAS_TO_EN dictionary
    if cas_normalized in CAS_TO_EN:
        return CAS_TO_EN[cas_normalized]
    
    return None

def get_chinese_name_from_dict(name_en: str) -> Optional[str]:
    """Get Chinese name from English name dictionary (optimized with pre-built index)."""
    if not name_en:
        return None
    name_lower = name_en.lower().strip()

    # O(1) exact match in expanded dictionary (1861 entries)
    if name_lower in CHEMICAL_NAMES_ZH_EXPANDED:
        return CHEMICAL_NAMES_ZH_EXPANDED[name_lower]

    # O(1) cleaned-name match via pre-built index
    name_clean = re.sub(r'[^a-z0-9]', '', name_lower)
    if name_clean in _CLEAN_NAME_INDEX:
        return _CLEAN_NAME_INDEX[name_clean]

    return None

async def _try_cid_by_name(cas_number: str, http_client: httpx.AsyncClient) -> Optional[int]:
    """CID lookup Method 1: Search by CAS number as compound name."""
    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{cas_number}/cids/JSON"
        response = await http_client.get(url, timeout=15.0)
        if response.status_code == 200:
            cids = response.json().get("IdentifierList", {}).get("CID", [])
            if cids:
                return cids[0]
    except Exception as e:
        logger.debug(f"CID by name failed for {cas_number}: {e}")
    return None

async def _try_cid_by_xref(cas_number: str, http_client: httpx.AsyncClient) -> Optional[int]:
    """CID lookup Method 2: Search via xref/rn endpoint."""
    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/xref/rn/{cas_number}/cids/JSON"
        response = await http_client.get(url, timeout=15.0)
        if response.status_code == 200:
            cids = response.json().get("IdentifierList", {}).get("CID", [])
            if cids:
                return cids[0]
    except Exception as e:
        logger.debug(f"CID by xref failed for {cas_number}: {e}")
    return None

async def _try_cid_by_substance(cas_number: str, http_client: httpx.AsyncClient) -> Optional[int]:
    """CID lookup Method 3: Search via substance xref."""
    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/substance/xref/rn/{cas_number}/cids/JSON"
        response = await http_client.get(url, timeout=15.0)
        if response.status_code == 200:
            cids = response.json().get("InformationList", {}).get("Information", [])
            if cids and cids[0].get("CID"):
                return cids[0]["CID"][0] if isinstance(cids[0]["CID"], list) else cids[0]["CID"]
    except Exception as e:
        logger.debug(f"CID by substance failed for {cas_number}: {e}")
    return None

async def get_cid_from_cas(cas_number: str, http_client: httpx.AsyncClient) -> Optional[int]:
    """Get PubChem CID from CAS number — runs methods 1-3 concurrently, with cache."""
    # Check cache first
    if cas_number in cid_cache:
        return cid_cache[cas_number]

    # Run methods 1-3 concurrently
    results = await asyncio.gather(
        _try_cid_by_name(cas_number, http_client),
        _try_cid_by_xref(cas_number, http_client),
        _try_cid_by_substance(cas_number, http_client),
        return_exceptions=True,
    )
    for result in results:
        if isinstance(result, int):
            cid_cache[cas_number] = result
            return result

    # Method 4 (fallback): Try with alternate CAS format
    cas_alt = re.sub(r'^0+', '', cas_number.split('-')[0]) + '-' + '-'.join(cas_number.split('-')[1:])
    if cas_alt != cas_number:
        cid = await _try_cid_by_name(cas_alt, http_client)
        if cid:
            cid_cache[cas_number] = cid
            return cid

    logger.warning(f"Could not find CID for CAS number: {cas_number}")
    return None

async def get_compound_name(cid: int, http_client: httpx.AsyncClient, known_zh: Optional[str] = None) -> tuple:
    """Get compound name in English and Chinese with multiple fallbacks.
    If known_zh is provided, skip expensive Chinese name lookups."""
    name_en = None
    name_zh = known_zh
    all_synonyms = []
    
    # Method 1: Get from property endpoint
    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/IUPACName,Title/JSON"
        response = await http_client.get(url, timeout=15.0)
        if response.status_code == 200:
            data = response.json()
            props = data.get("PropertyTable", {}).get("Properties", [{}])[0]
            name_en = props.get("Title") or props.get("IUPACName")
    except Exception as e:
        logger.debug(f"Property endpoint failed for CID {cid}: {e}")
    
    # Method 2: Get from synonyms endpoint
    try:
        syn_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
        syn_response = await http_client.get(syn_url, timeout=15.0)
        if syn_response.status_code == 200:
            syn_data = syn_response.json()
            all_synonyms = syn_data.get("InformationList", {}).get("Information", [{}])[0].get("Synonym", [])
            
            # If no name_en yet, use first synonym
            if not name_en and all_synonyms:
                name_en = all_synonyms[0]
            
            # Look for Chinese characters in synonyms
            for syn in all_synonyms:
                if any('\u4e00' <= char <= '\u9fff' for char in syn):
                    name_zh = syn
                    break
    except Exception as e:
        logger.debug(f"Synonyms endpoint failed for CID {cid}: {e}")
    
    # Method 3: Try description endpoint for name
    if not name_en:
        try:
            desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/description/JSON"
            desc_response = await http_client.get(desc_url, timeout=15.0)
            if desc_response.status_code == 200:
                desc_data = desc_response.json()
                info_list = desc_data.get("InformationList", {}).get("Information", [])
                if info_list:
                    name_en = info_list[0].get("Title")
        except Exception as e:
            logger.debug(f"Description endpoint failed for CID {cid}: {e}")
    
    # If no Chinese name yet, try local dictionary lookups
    if not name_zh and name_en:
        name_zh = get_chinese_name_from_dict(name_en)
    if not name_zh:
        for syn in all_synonyms[:15]:
            zh = get_chinese_name_from_dict(syn)
            if zh:
                name_zh = zh
                break

    return name_en, name_zh

def extract_record_title(ghs_data: dict) -> str:
    """Extract RecordTitle from GHS data as fallback name"""
    try:
        return ghs_data.get("Record", {}).get("RecordTitle", "")
    except:
        return ""

def extract_iupac_name(ghs_data: dict) -> str:
    """Extract IUPAC name from GHS data as another fallback"""
    try:
        sections = ghs_data.get("Record", {}).get("Section", [])
        for section in sections:
            if section.get("TOCHeading") == "Names and Identifiers":
                for subsection in section.get("Section", []):
                    if subsection.get("TOCHeading") == "Computed Descriptors":
                        for subsubsection in subsection.get("Section", []):
                            if subsubsection.get("TOCHeading") == "IUPAC Name":
                                info = subsubsection.get("Information", [{}])[0]
                                return info.get("Value", {}).get("StringWithMarkup", [{}])[0].get("String", "")
    except:
        pass
    return ""

async def get_ghs_classification(cid: int, http_client: httpx.AsyncClient) -> dict:
    """Get GHS classification from PubChem (with 24hr cache)."""
    if cid in ghs_cache:
        return ghs_cache[cid]
    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON"
        response = await http_client.get(url, timeout=30.0)
        if response.status_code == 200:
            data = response.json()
            ghs_cache[cid] = data
            return data
    except Exception as e:
        logger.error(f"Error getting GHS data for CID {cid}: {e}")
    return {}

async def search_chemical(cas_number: str, http_client: httpx.AsyncClient) -> ChemicalResult:
    """Search for a chemical by CAS number"""
    normalized_cas = normalize_cas(cas_number)
    
    if not normalized_cas:
        return ChemicalResult(
            cas_number=cas_number,
            found=False,
            error="無效的 CAS 號碼格式（正確格式如：64-17-5）"
        )
    
    # Validate CAS number format (should be like XX-XX-X or XXXXX-XX-X)
    cas_pattern = re.match(r'^(\d{2,7})-(\d{2})-(\d)$', normalized_cas)
    if not cas_pattern:
        return ChemicalResult(
            cas_number=cas_number,
            found=False,
            error=f"CAS 號碼格式不正確：{normalized_cas}（正確格式如：64-17-5）"
        )
    
    # ===== NEW: Try to get Chinese and English name from CAS dictionary FIRST (most accurate) =====
    name_zh_from_cas = get_chinese_name_from_cas(normalized_cas)
    name_en_from_cas = get_english_name_from_cas(normalized_cas)
    if name_zh_from_cas:
        logger.info(f"Found Chinese name from CAS dictionary for {normalized_cas}: {name_zh_from_cas}")
    if name_en_from_cas:
        logger.info(f"Found English name from CAS dictionary for {normalized_cas}: {name_en_from_cas}")
    
    # Get CID - try multiple methods
    cid = await get_cid_from_cas(normalized_cas, http_client)
    if not cid:
        # Even if PubChem doesn't have CID, we might have local data
        if name_zh_from_cas or name_en_from_cas:
            return ChemicalResult(
                cas_number=cas_number,
                cid=None,
                name_en=name_en_from_cas,  # Provide English name from local dictionary
                name_zh=name_zh_from_cas,
                ghs_pictograms=[],
                hazard_statements=[],
                signal_word=None,
                signal_word_zh=None,
                found=True,
                error="PubChem 無 GHS 資料，僅提供本地字典名稱"
            )
        # Provide more helpful error message
        return ChemicalResult(
            cas_number=cas_number,
            found=False,
            error=f"在 PubChem 資料庫中找不到 CAS {normalized_cas}，請確認號碼是否正確"
        )
    
    # Get compound name and GHS data concurrently
    # Pass known Chinese name to skip redundant dictionary lookups
    name_task = get_compound_name(cid, http_client, known_zh=name_zh_from_cas)
    ghs_task = get_ghs_classification(cid, http_client)
    
    (name_en, name_zh), ghs_data = await asyncio.gather(name_task, ghs_task)
    
    # Extract ALL GHS classification reports
    all_classifications = extract_all_ghs_classifications(ghs_data)
    
    # Separate primary (first) classification from others
    primary_pictograms = []
    primary_hazards = []
    primary_signal = None
    primary_signal_zh = None
    other_classifications = []
    
    if all_classifications:
        # First report is the primary classification
        primary = all_classifications[0]
        primary_pictograms = primary.get("pictograms", [])
        primary_hazards = primary.get("hazard_statements", [])
        primary_signal = primary.get("signal_word")
        primary_signal_zh = primary.get("signal_word_zh")
        
        # Rest are other classifications (deduplicate by pictogram set)
        seen_pictogram_sets = set()
        primary_pic_set = frozenset(p["code"] for p in primary_pictograms)
        seen_pictogram_sets.add(primary_pic_set)
        
        for report in all_classifications[1:]:
            pic_set = frozenset(p["code"] for p in report.get("pictograms", []))
            if pic_set and pic_set not in seen_pictogram_sets:
                seen_pictogram_sets.add(pic_set)
                other_classifications.append(GHSReport(
                    pictograms=report.get("pictograms", []),
                    hazard_statements=report.get("hazard_statements", []),
                    signal_word=report.get("signal_word"),
                    signal_word_zh=report.get("signal_word_zh"),
                    source=report.get("source"),
                    report_count=report.get("report_count")
                ))
    
    # Use RecordTitle as fallback for name_en if not found
    if not name_en:
        name_en = extract_record_title(ghs_data)
    
    # Try IUPAC name as another fallback
    if not name_en:
        name_en = extract_iupac_name(ghs_data)
    
    # If still no name, use CAS number as name
    if not name_en:
        name_en = f"CID-{cid}"
        logger.warning(f"No name found for CAS {cas_number}, using CID as fallback")
    
    # ===== OPTIMIZED Chinese name lookup order =====
    # Priority 1: CAS dictionary (most accurate - from user's Excel)
    if name_zh_from_cas:
        name_zh = name_zh_from_cas
    # Priority 2: PubChem Chinese synonyms (already fetched)
    elif name_zh:
        pass  # Keep PubChem result
    # Priority 3: English name dictionary lookup
    else:
        name_zh = get_chinese_name_from_dict(name_en)
    
    return ChemicalResult(
        cas_number=cas_number,
        cid=cid,
        name_en=name_en,
        name_zh=name_zh,
        ghs_pictograms=primary_pictograms,
        hazard_statements=primary_hazards,
        signal_word=primary_signal,
        signal_word_zh=primary_signal_zh,
        other_classifications=other_classifications,
        has_multiple_classifications=len(other_classifications) > 0,
        found=True
    )

# API Routes
@api_router.get("/")
async def root():
    return {"message": "GHS Label Quick Search API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": APP_VERSION,
    }

@api_router.post("/search", response_model=List[ChemicalResult])
async def search_chemicals(query: CASQuery):
    """Search for chemicals by CAS numbers"""
    results = []
    http_client = shared_http_client
    # Process in batches to avoid overwhelming the API
    batch_size = 5
    for i in range(0, len(query.cas_numbers), batch_size):
        batch = query.cas_numbers[i:i+batch_size]
        tasks = [search_chemical(cas, http_client) for cas in batch]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
        # Add small delay between batches
        if i + batch_size < len(query.cas_numbers):
            await asyncio.sleep(0.5)
    return results

@api_router.get("/search/{cas_number}", response_model=ChemicalResult)
async def search_single_chemical(cas_number: str):
    """Search for a single chemical by CAS number"""
    return await search_chemical(cas_number, shared_http_client)

@api_router.post("/export/xlsx")
async def export_xlsx(request: ExportRequest):
    """Export results to Excel file"""
    wb = Workbook()
    ws = wb.active
    ws.title = "GHS查詢結果"
    
    # Header style
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Data
    for row, result in enumerate(request.results, 2):
        ws.cell(row=row, column=1, value=result.get("cas_number", "")).border = thin_border
        ws.cell(row=row, column=2, value=result.get("name_en", "")).border = thin_border
        ws.cell(row=row, column=3, value=result.get("name_zh", "")).border = thin_border
        
        # GHS pictograms
        pictograms = result.get("ghs_pictograms", [])
        ghs_text = ", ".join([f"{p.get('code', '')} ({p.get('name_zh', '')})" for p in pictograms]) if pictograms else "無"
        ws.cell(row=row, column=4, value=ghs_text).border = thin_border
        
        # Signal word
        signal = result.get("signal_word_zh") or result.get("signal_word") or "-"
        ws.cell(row=row, column=5, value=signal).border = thin_border
        
        # Hazard statements
        statements = result.get("hazard_statements", [])
        hazard_text = "\n".join([f"{s.get('code', '')}: {s.get('text_zh', '')}" for s in statements]) if statements else "無危害說明"
        cell = ws.cell(row=row, column=6, value=hazard_text)
        cell.border = thin_border
        cell.alignment = Alignment(wrap_text=True)
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['B'].width = 30
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 35
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 50
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=ghs_results.xlsx"}
    )

@api_router.post("/export/csv")
async def export_csv(request: ExportRequest):
    """Export results to CSV file"""
    from io import StringIO
    string_output = StringIO()
    writer = csv.writer(string_output)
    
    # Headers
    writer.writerow(["CAS No.", "英文名稱", "中文名稱", "GHS標示", "警示語", "危害說明"])
    
    # Data
    for result in request.results:
        pictograms = result.get("ghs_pictograms", [])
        ghs_text = ", ".join([f"{p.get('code', '')} ({p.get('name_zh', '')})" for p in pictograms]) if pictograms else "無"
        
        signal = result.get("signal_word_zh") or result.get("signal_word") or "-"
        
        statements = result.get("hazard_statements", [])
        hazard_text = "; ".join([f"{s.get('code', '')}: {s.get('text_zh', '')}" for s in statements]) if statements else "無危害說明"
        
        writer.writerow([
            result.get("cas_number", ""),
            result.get("name_en", ""),
            result.get("name_zh", ""),
            ghs_text,
            signal,
            hazard_text
        ])
    
    # Convert to bytes with BOM
    csv_content = string_output.getvalue()
    output = BytesIO()
    output.write(b'\xef\xbb\xbf')  # BOM
    output.write(csv_content.encode('utf-8'))
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=ghs_results.csv"}
    )

@api_router.get("/ghs-pictograms")
async def get_ghs_pictograms():
    """Get all GHS pictogram information"""
    return GHS_PICTOGRAMS

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', 'https://ghs-frontend.zeabur.app').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

