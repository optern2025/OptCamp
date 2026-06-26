file_path = "optcamp/extract_pdf.py"

edit_description = "Create Python script to extract PDF text"

from pypdf import PdfReader

reader = PdfReader("T&C and every legal.pdf")

for i, page in enumerate(reader.pages):
    print(f"\n=== PAGE {i + 1} ===\n")
    print(page.extract_text())
