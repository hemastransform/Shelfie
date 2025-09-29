import os
import json
import uuid
from datetime import datetime, timedelta
import azure.functions as func
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.data.tables import TableServiceClient, TableEntity

# --- AZURE CONFIGURATION ---
# These must be set as Application Settings in your Static Web App
AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
BLOB_CONTAINER_NAME = "raw-images"
TABLE_NAME = "ImageMetadata"

def main(req: func.HttpRequest) -> func.HttpResponse:
    try:
        data = req.get_json()
        image_id = str(uuid.uuid4())
        filename = f"{image_id}-{data['filename']}"
        
        # --- 1. Generate Secure SAS URL for Blob Storage Upload ---
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=BLOB_CONTAINER_NAME,
            blob_name=filename,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(write=True),
            expiry=datetime.utcnow() + timedelta(minutes=5) # URL is valid for 5 minutes
        )
        upload_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{BLOB_CONTAINER_NAME}/{filename}?{sas_token}"
        
        # --- 2. Save Metadata to Azure Table Storage ---
        table_service_client = TableServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        table_client = table_service_client.get_table_client(table_name=TABLE_NAME)
        
        # --- FIX IS HERE ---
        # This will now safely create the table only if it doesn't already exist.
        table_client.create_table_if_not_exists()
        # --- END OF FIX ---
        
        entity = TableEntity(
            PartitionKey=data['city'],
            RowKey=image_id,
            SalesID=data['sales_id'],
            OutletName=data['outlet_name'],
            Address=data['address'],
            Territory=data['territory'],
            LocationGPS=data['location_gps'],
            BlobFilename=filename,
            UploadTimestampUTC=datetime.utcnow().isoformat(),
            ProcessingStatus="Pending"
        )
        table_client.create_entity(entity=entity)

        # --- 3. Return the secure URL to the browser ---
        return func.HttpResponse(
            json.dumps({"upload_url": upload_url, "image_id": image_id}),
            mimetype="application/json"
        )

    except Exception as e:
        return func.HttpResponse(f"Error: {str(e)}", status_code=500)