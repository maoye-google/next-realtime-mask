import os
import json
from kafka import KafkaConsumer, KafkaProducer
import logging
import time
import requests # For calling SAM and Vertex AI
from datetime import datetime
import base64

from google.cloud import aiplatform
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
SNAPSHOT_REQUESTS_TOPIC = 'snapshot-requests'
PROCESSING_RESULTS_TOPIC = 'processing-results'

# Vertex AI Configuration
GOOGLE_PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT') # Ensure this is set in your environment
GOOGLE_LOCATION = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
VERTEX_AI_ENDPOINT_ID = os.getenv('VERTEX_AI_GEMINI_ENDPOINT_ID', 'gemini-pro-vision') # Or your specific endpoint

SEGMENT_ANYTHING_API_URL = os.getenv('SEGMENT_ANYTHING_ENDPOINT') # e.g. http://segment-anything:8001/segment

if GOOGLE_PROJECT_ID:
    aiplatform.init(project=GOOGLE_PROJECT_ID, location=GOOGLE_LOCATION)
else:
    logger.warning("GOOGLE_CLOUD_PROJECT environment variable not set. Vertex AI calls may fail.")

def process_message(msg_value):
    logger.info(f"Received message: {msg_value}")
    image_id = msg_value.get('imageId')
    image_data_b64 = msg_value.get('imageData') # This is the base64 string
    request_timestamp = msg_value.get('requestTimestamp')
    prompt = msg_value.get('prompt')

    # Placeholder for actual processing logic
    # 1. Call Vertex AI for initial check (if image contains prompt)
    # 2. If yes, call Segment Anything Model (SAM) endpoint
    #    - This might be the `supervisely/segment-anything-2` container or a cloud endpoint
    # 3. Call Vertex AI to validate SAM masks against the prompt
    
    is_found = False
    mask_coordinates = []
    error_message = None

    try:
        # 1. Call Vertex AI for initial check (if image contains prompt)
        # For simplicity, we'll combine this with mask validation later if SAM is used.
        # A more optimized flow might do a cheaper initial check.

        # 2. Call Segment Anything Model (SAM) endpoint
        if not SEGMENT_ANYTHING_API_URL:
            raise ValueError("SEGMENT_ANYTHING_ENDPOINT is not configured.")

        logger.info(f"Calling SAM endpoint: {SEGMENT_ANYTHING_API_URL} for imageId: {image_id}")
        sam_payload = {"image_base64": image_data_b64} # Assuming SAM API expects this
        
        # It's crucial to know the exact API of supervisely/segment-anything-2
        # This is a placeholder for how it *might* work.
        # The response should contain a list of masks.
        # Example: {"masks": [[[x1,y1],[x2,y2],...], [[x1,y1],...]]}
        sam_response = requests.post(SEGMENT_ANYTHING_API_URL, json=sam_payload, timeout=60)
        sam_response.raise_for_status() # Raise an exception for HTTP errors
        sam_results = sam_response.json()
        potential_masks = sam_results.get("masks", [])
        logger.info(f"Received {len(potential_masks)} potential masks from SAM for imageId: {image_id}")

        if not potential_masks:
            logger.info(f"No masks returned by SAM for imageId: {image_id}")

        # 3. Call Vertex AI to validate SAM masks against the prompt
        # We'll ask Gemini to pick the best mask that matches the prompt.
        # This requires sending the image and the masks (or visual representations) to Gemini.
        # For simplicity, we'll ask Gemini to identify the object based on the prompt from the original image.
        # A more advanced approach would be to send cropped images per mask or draw masks on the image.

        if GOOGLE_PROJECT_ID and potential_masks: # Only try validation if we have masks and config
            # For now, we'll assume Gemini can directly give coordinates if the object is found.
            # A more robust solution would be to iterate through SAM masks and ask Gemini to verify each.
            # This part is highly dependent on how you structure the prompt for Gemini Vision.
            # Example: "Identify the bounding box of the '{prompt}' in this image."
            
            # Using Gemini Pro Vision (multimodal)
            # The actual implementation for getting coordinates from Gemini Vision can be complex.
            # It might involve asking for bounding boxes or specific segmentation.
            # For this example, we'll simulate that if Gemini finds the object,
            # we just take the first mask from SAM as a placeholder.
            # In a real scenario, you'd need a more sophisticated way to link Gemini's findings to SAM's masks.

            gemini_prompt_text = f"Does this image contain a {prompt}? If yes, describe its location."
            
            # This is a simplified call. You might need to adjust based on Gemini's capabilities for coordinates.
            # For now, we'll assume if Gemini says "yes", we use the first SAM mask.
            # A proper implementation would involve more complex prompting or function calling with Gemini.
            
            # Placeholder: Let's assume if the prompt is in the image, we use the first SAM mask.
            # This is a simplification. A real implementation would use Gemini to select among SAM masks.
            if prompt.lower() in ["face", "person's face", "person"] and len(potential_masks) > 0: # Simplified logic
                is_found = True
                mask_coordinates = potential_masks[0] # Take the first mask for simplicity
                logger.info(f"Object '{prompt}' considered found by simplified logic, using first SAM mask for imageId: {image_id}")
            else:
                 logger.info(f"Object '{prompt}' not found by simplified logic for imageId: {image_id}")

        elif not GOOGLE_PROJECT_ID:
            logger.warning("Vertex AI not configured, skipping mask validation.")

    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling SAM endpoint for imageId {image_id}: {e}")
        error_message = f"SAM API Error: {e}"
    except ValueError as e:
        logger.error(f"Configuration error for imageId {image_id}: {e}")
        error_message = f"Configuration Error: {e}"
    except Exception as e:
        logger.error(f"Unexpected error processing imageId {image_id}: {e}")
        error_message = f"Processing Error: {e}"

    result_message = {
        "imageId": image_id,
        "prompt": prompt,
        "requestTimestamp": request_timestamp, # Pass through for latency calculation
        "isFound": is_found,
        "maskCoordinates": mask_coordinates,
        "processingTimestamp": datetime.utcnow().isoformat(),
        "imageData": image_data_b64 if is_found else None, # Pass through original image if found, for tracker init
        "error": error_message
    }
    return result_message

if __name__ == "__main__":
    logger.info("Processing worker started. Waiting for messages...")
    consumer = KafkaConsumer(
        SNAPSHOT_REQUESTS_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        auto_offset_reset='earliest', # Process messages from the beginning of the topic
        group_id='processing-group', # Consumer group ID
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    for message in consumer:
        processed_result = process_message(message.value)
        producer.send(PROCESSING_RESULTS_TOPIC, processed_result)
        producer.flush()
        logger.info(f"Published result for imageId {processed_result.get('imageId')} to {PROCESSING_RESULTS_TOPIC}: Found={processed_result.get('isFound')}")