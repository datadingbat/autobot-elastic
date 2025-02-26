import fitz
import re
import unicodedata
import logging
import os
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ChunkingConfig:
    """Configuration for content chunking"""
    min_chunk_size: int = 100
    max_chunk_size: int = 1000
    min_sentences_per_chunk: int = 2
    overlap_sentences: int = 1

class PDFToTSVConverter:
    def __init__(self, chunking_config: Optional[ChunkingConfig] = None):
        self.config = chunking_config or ChunkingConfig()
        self._compile_patterns()
        self.doc_id_counter = int(time.time() * 1000)

    def _compile_patterns(self):
        """Compile regex patterns for text processing"""
        self.sentence_pattern = re.compile(
            r'(?<!Mr)(?<!Mrs)(?<!Ms)(?<!Dr)(?<!Jr)(?<!Sr)(?<!Prof)'
            r'(?<!\w\.\w)(?<=[.!?])\s+(?=[A-Z])'
        )
        self.whitespace_pattern = re.compile(r'\s+')
        self.section_break_pattern = re.compile(r'\n\n+')

    def get_next_id(self) -> int:
        """Generate the next sequential document ID."""
        self.doc_id_counter += 1
        return self.doc_id_counter

    def clean_text(self, text: str) -> str:
        """Clean extracted text while preserving meaningful characters."""
        if not text:
            return ""
            
        # Replace various types of whitespace with a single space
        text = self.whitespace_pattern.sub(' ', text)
        
        # Remove control characters while preserving newlines
        text = ''.join(char if unicodedata.category(char)[0] != 'C' 
                      or char in '\n\t' else ' ' 
                      for char in text)
        
        # Remove zero-width spaces and other invisible characters
        text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
        
        # Normalize unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        return text.strip()

    def split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences using smart sentence boundary detection."""
        sentences = self.sentence_pattern.split(text)
        return [s.strip() for s in sentences if s.strip()]

    def extract_links_from_page(self, page) -> List[Dict]:
        """Extract links from a PDF page using PyMuPDF."""
        links = []
        
        # Get all links on the page
        for link in page.get_links():
            link_data = {}
            
            # Get link type and destination
            if link.get("kind") == fitz.LINK_URI:
                link_data["type"] = "external"
                link_data["uri"] = link["uri"]
            elif link.get("kind") == fitz.LINK_GOTO:
                link_data["type"] = "internal"
                link_data["uri"] = f"page_{link.get('page', 0) + 1}"
            elif link.get("kind") == fitz.LINK_NAMED:
                link_data["type"] = "named"
                if "name" in link:
                    link_data["uri"] = link["name"]
                else:
                    logger.debug(f"Link of kind 'named' does not have a 'name' attribute: {link}")
            
            # Get the link text by extracting from the rect area
            if "from" in link:
                rect = fitz.Rect(link["from"])
                words = page.get_text("text", clip=rect)
                link_data["text"] = words.strip()
            
            if link_data.get("uri"):
                link_data["page"] = page.number + 1
                links.append(link_data)
                logger.debug(f"Found link: {link_data}")
        
        return links

    def create_meaningful_chunks(self, sentences: List[str], page_links: List[Dict] = None) -> List[str]:
        """Create meaningful chunks from sentences while preserving link context."""
        if page_links is None:
            page_links = []
            
        chunks = []
        current_chunk = []
        current_length = 0
        
        # Create a map of sentences containing links
        link_sentences = set()
        for link in page_links:
            if not link.get('text'):
                continue
            link_text = link['text'].strip()
            for i, sentence in enumerate(sentences):
                if link_text in sentence:
                    link_sentences.add(i)
                    # Also add adjacent sentences for context
                    if i > 0:
                        link_sentences.add(i - 1)
                    if i < len(sentences) - 1:
                        link_sentences.add(i + 1)

        i = 0
        while i < len(sentences):
            sentence = sentences[i]
            sentence_length = len(sentence)
            
            # Check if this sentence contains a link or is part of link context
            is_link_context = i in link_sentences
            
            # If adding this sentence would exceed max_chunk_size and we have enough sentences
            # for a chunk, AND the sentence isn't part of a link context
            if (current_length + sentence_length > self.config.max_chunk_size and 
                len(current_chunk) >= self.config.min_sentences_per_chunk and
                not is_link_context):
                
                chunks.append(' '.join(current_chunk))
                
                # Start new chunk with overlap
                overlap_start = max(0, len(current_chunk) - self.config.overlap_sentences)
                current_chunk = current_chunk[overlap_start:]
                current_length = sum(len(s) for s in current_chunk)
            
            current_chunk.append(sentence)
            current_length += sentence_length
            
            # If we have enough sentences and hit a good breaking point,
            # AND the next sentence isn't part of a link context
            next_is_link_context = (i + 1) in link_sentences if i + 1 < len(sentences) else False
            if (len(current_chunk) >= self.config.min_sentences_per_chunk * 2 and
                current_length >= self.config.min_chunk_size and
                i < len(sentences) - 1 and
                self._is_good_break_point(sentence, sentences[i + 1]) and
                not next_is_link_context and
                not is_link_context):
                
                chunks.append(' '.join(current_chunk))
                
                # Start new chunk with overlap
                overlap_start = max(0, len(current_chunk) - self.config.overlap_sentences)
                current_chunk = current_chunk[overlap_start:]
                current_length = sum(len(s) for s in current_chunk)
            
            i += 1
        
        # Add any remaining sentences as the last chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks

    def _is_good_break_point(self, current_sentence: str, next_sentence: str) -> bool:
        """Determine if this is a good point to break the text into chunks."""
        if current_sentence.endswith('.') and next_sentence.startswith(('However', 'Moreover', 'Furthermore')):
            return True
            
        if (current_sentence.endswith('.') and 
            not any(current_sentence.lower().endswith(x) for x in [' etc.', 'e.g.', 'i.e.']) and
            next_sentence[0].isupper()):
            return True
            
        return False

    def enrich_chunk_with_links(self, chunk: str, links: List[Dict]) -> str:
        """Add link information inline within the chunk text."""
        if not links:
            return chunk
            
        # Sort links by text length (longest first) to handle nested links correctly
        sorted_links = sorted(links, key=lambda x: len(x.get('text', '')), reverse=True)
        
        enriched_text = chunk
        for link in sorted_links:
            if not link.get('text') or not link.get('uri'):
                continue
                
            link_text = link['text'].strip()
            if link_text in enriched_text:
                # Create the replacement format: text[link:url]
                replacement = f"{link_text}[link:{link['uri']}]"
                enriched_text = enriched_text.replace(link_text, replacement)
        
        return enriched_text

    def process_pdf(self, pdf_path: str, output_path: str) -> None:
        """Process PDF file and output TSV format with meaningful chunks."""
        try:
            # Open PDF with PyMuPDF
            doc = fitz.open(pdf_path)
            
            logger.info("Processing PDF...")
            chunks = []
            
            # Process page by page to maintain link context
            for page_num in range(doc.page_count):
                page = doc[page_num]
                logger.info(f"Processing page {page_num + 1} of {doc.page_count}")
                
                # Get text and links for this page
                page_text = page.get_text()
                page_links = self.extract_links_from_page(page)
                
                # Clean text
                cleaned_text = self.clean_text(page_text)
                if not cleaned_text:
                    continue
                    
                # Split into sentences and create chunks
                sentences = self.split_into_sentences(cleaned_text)
                page_chunks = self.create_meaningful_chunks(sentences, page_links)
                
                # Enrich chunks with links
                for chunk in page_chunks:
                    chunk_links = [
                        link for link in page_links 
                        if link.get('text') and link['text'] in chunk
                    ]
                    enriched_chunk = self.enrich_chunk_with_links(chunk, chunk_links)
                    chunks.append(enriched_chunk)

            # Write to TSV
            with open(output_path, 'w', encoding='utf-8') as f:
                for chunk in chunks:
                    chunk_id = self.get_next_id()
                    f.write(f"{chunk_id}\t{chunk}\n")
            
            logger.info(f"Successfully processed PDF with {len(chunks)} chunks")
            logger.info(f"Output saved to: {output_path}")
            
            # Close the PDF
            doc.close()
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {str(e)}")
            raise

def main():
    print("\nPDF to TSV Converter (with hyperlink support)")
    print("============================================")
    
    # Get PDF file path from user
    while True:
        pdf_path = input("\nEnter the path to your PDF file: ").strip()
        if os.path.exists(pdf_path) and pdf_path.lower().endswith('.pdf'):
            break
        print("❌ Invalid file path or not a PDF file. Please try again.")
    
    # Generate output path
    output_path = os.path.splitext(pdf_path)[0] + '.tsv'
    print(f"\nOutput will be saved to: {output_path}")
    
    # Initialize converter with custom configuration
    config = ChunkingConfig(
        min_chunk_size=100,
        max_chunk_size=1000,
        min_sentences_per_chunk=2,
        overlap_sentences=1
    )
    
    converter = PDFToTSVConverter(config)
    
    try:
        print("\nProcessing PDF...")
        converter.process_pdf(pdf_path, output_path)
        print("✅ Processing complete!")
        print(f"\nOutput has been saved to: {output_path}")
        
    except Exception as e:
        print(f"\n❌ Error during processing: {str(e)}")

if __name__ == "__main__":
    main()
