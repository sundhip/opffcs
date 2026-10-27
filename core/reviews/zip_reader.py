import zipfile
import os
from typing import Dict, List, Tuple, Any, Optional

class ZipChatReader:
    """
    Reads WhatsApp chat exports directly from zip archives without moving
    or permanently extracting files. Handles UTF-8 BOM, UTF-16, and tracks media entries.
    """
    def __init__(self, zip_path: str):
        self.zip_path = zip_path
        if not os.path.exists(zip_path):
            raise FileNotFoundError(f"ZIP archive not found: {zip_path}")
        self.zip_name = os.path.basename(zip_path)

    def read_chat_text(self) -> Dict[str, Any]:
        with zipfile.ZipFile(self.zip_path, "r") as z:
            infolist = z.infolist()
            txt_files = [info for info in infolist if info.filename.endswith(".txt")]
            media_files = [info for info in infolist if not info.filename.endswith(".txt") and not info.is_dir()]
            
            if not txt_files:
                raise ValueError(f"No .txt chat export found inside archive {self.zip_name}")
                
            # Usually '_chat.txt'
            chat_info = txt_files[0]
            raw_bytes = z.read(chat_info)
            
            # Detect encoding and strip BOM
            encoding = "utf-8"
            if raw_bytes.startswith(b'\xef\xbb\xbf'):
                encoding = "utf-8-sig"
                text = raw_bytes.decode("utf-8-sig")
            elif raw_bytes.startswith(b'\xff\xfe') or raw_bytes.startswith(b'\xfe\xff'):
                encoding = "utf-16"
                text = raw_bytes.decode("utf-16")
            else:
                try:
                    text = raw_bytes.decode("utf-8")
                    encoding = "utf-8"
                except UnicodeDecodeError:
                    text = raw_bytes.decode("latin1")
                    encoding = "latin1"

            # Split into lines preserving line structure
            lines = text.splitlines()

            return {
                "source_zip": self.zip_name,
                "source_file": chat_info.filename,
                "filename": chat_info.filename,
                "encoding": encoding,
                "total_zip_files": len(infolist),
                "media_count": len(media_files),
                "uncompressed_bytes": chat_info.file_size,
                "lines": lines
            }

def read_whatsapp_zip(zip_path: str) -> List[Dict[str, Any]]:
    """
    Convenience function to read all chat text files from a WhatsApp zip.
    """
    reader = ZipChatReader(zip_path)
    return [reader.read_chat_text()]

