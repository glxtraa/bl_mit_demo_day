import pandas as pd
import requests
import json
from datetime import datetime

def download_sscap_data(api_url):
    """
    Downloads data from the SSCAP API and returns a flattened pandas DataFrame.
    
    Args:
        api_url (str): The base URL of your Vercel deployment (e.g., 'https://sscap-api.vercel.app')
        
    Returns:
        pd.DataFrame: A flattened DataFrame containing all SSCAP records.
    """
    # Clean up the URL
    api_url = api_url.rstrip('/')
    if not api_url.endswith('/api/download'):
        download_url = f"{api_url}/api/download"
    else:
        download_url = api_url
    
    print(f"Fetching data from {download_url}...")
    try:
        response = requests.get(download_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None
    
    json_response = response.json()
    records = json_response.get('data', [])
    
    if not records:
        print("No records found.")
        return pd.DataFrame()
    
    print(f"Processing {len(records)} records...")
    
    flattened_records = []
    for record in records:
        filename = record.get('filename', '')
        # Extract record type from filename (e.g., 'sscap/nivel/...')
        parts = filename.split('/')
        # parts[0] is 'sscap', parts[1] is the type (nivel, captado, utilizado)
        record_type = parts[1] if len(parts) > 1 else 'unknown'
        
        content = record.get('content', {})
        record_data = content.get('data', {})
        metadata = content.get('metadata', {})
        
        # Merge all into a flat dictionary
        flat_record = {
            'record_id': content.get('id'),
            'type': record_type,
            'filename': filename,
            'uploaded_at': record.get('uploadedAt'),
            'created_at': content.get('created_at'),
            'updated_at': content.get('updated_at'),
            # Spread the 'data' fields (tlaloque_id, meters, pulses, catched_at, used_at, etc.)
            **record_data,
            # Metadata fields
            'meta_ip': metadata.get('ip'),
            'meta_city': metadata.get('city'),
            'meta_country': metadata.get('country'),
            'meta_user_agent': metadata.get('userAgent')
        }
        flattened_records.append(flat_record)
        
    df = pd.DataFrame(flattened_records)
    
    # Convert timestamps to datetime objects for analysis
    timestamp_cols = ['uploaded_at', 'created_at', 'updated_at', 'catched_at', 'used_at']
    for col in timestamp_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors='coerce')
            
    return df

if __name__ == "__main__":
    # This block is for testing locally if needed
    # URL = "https://your-app.vercel.app"
    # df = download_sscap_data(URL)
    # if df is not None:
    #     print(df.head())
    print("This script is intended to be used in Google Colab or as a module.")
