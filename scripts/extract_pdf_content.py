"""
Script to extract text content from NEPBA PDF files for creating a benefits page.
"""
import pdfplumber
import os
from pathlib import Path

PDF_DIR = r"G:\My Drive\NEPBA\NEPBA Dues_ Health and Welfare_ Life Insurance Forms- NEW MEMBERS"

def extract_pdf_text(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
    except Exception as e:
        return f"Error reading {pdf_path}: {e}"
    return "\n\n--- PAGE BREAK ---\n\n".join(text)

def main():
    """Extract and print content from all PDFs."""
    pdf_files = [
        "Benefits Cheat Sheet.pdf",
        "2018 NEPBA Altus Dental SBC.pdf", 
        "2018 NEPBA Eye Med Vision SBC.pdf",
        "Long Term Disability.pdf",
        "2018 NEPBA Boston Mutual Life Enrollment Form.pdf",
        "Nepba DUES DEDUCTION Form AS OF 1-1-2021.pdf",
    ]
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        print(f"\n{'='*80}")
        print(f"FILE: {pdf_file}")
        print(f"{'='*80}")
        
        if os.path.exists(pdf_path):
            content = extract_pdf_text(pdf_path)
            print(content)
        else:
            print(f"File not found: {pdf_path}")
        
        print()

if __name__ == "__main__":
    main()
