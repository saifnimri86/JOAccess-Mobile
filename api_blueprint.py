"""
JOAccess Mobile API Blueprint
==============================
Drop this file into your Flask project root (same level as app.py).
Then in app.py, add these two lines after creating the Flask app:

    from api_blueprint import mobile_api, jwt
    jwt.init_app(app)
    app.register_blueprint(mobile_api, url_prefix='/api/v1')

Also add flask-jwt-extended to your requirements.txt and install it:
    pip install flask-jwt-extended

All existing web routes remain untouched. The mobile app talks exclusively
to /api/v1/* endpoints with JWT Bearer tokens for authentication.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
import json
import base64

mobile_api = Blueprint('mobile_api', __name__)
jwt = JWTManager()
bcrypt = Bcrypt()

# ─────────────────────────────────────────────
# Helper: get current user from JWT identity
# ─────────────────────────────────────────────
def get_current_user():
    """Retrieve the User object for the currently authenticated JWT identity."""
    from app import User
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def admin_required_api(fn):
    """Decorator that requires both a valid JWT and admin privileges."""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ═════════════════════════════════════════════
#  AUTH ENDPOINTS
# ═════════════════════════════════════════════

@mobile_api.route('/auth/signup', methods=['POST'])
def api_signup():
    """
    Register a new user account.
    
    Request JSON:
    {
        "username": "string (required)",
        "email": "string (required)",
        "password": "string (required, min 6 chars)",
        "user_type": "individual | organization (required)",
        "organization_name": "string (optional, required if user_type=organization)",
        "disability": "string | null (optional)"
    }
    
    Returns:
        201: { success, message, user: { id, username, email, user_type, is_admin } }
        400: { error } on validation failure
        409: { error } on duplicate email/username
    """
    from app import User, db, ADMIN_EMAILS

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    user_type = data.get('user_type') or 'individual'
    organization_name = data.get('organization_name')
    disability = data.get('disability')

    # ── Validation ──
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if user_type not in ('individual', 'organization'):
        return jsonify({'error': 'user_type must be "individual" or "organization"'}), 400

    if user_type == 'organization' and not organization_name:
        return jsonify({'error': 'organization_name is required for organization accounts'}), 400

    # ── Duplicate check ──
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    # ── Create user ──
    is_admin = email in ADMIN_EMAILS
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    user = User(
        username=username,
        email=email,
        password=hashed_password,
        user_type=user_type,
        organization_name=organization_name if user_type == 'organization' else None,
        disability=disability,
        is_admin=is_admin
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Account created successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'is_admin': user.is_admin
        }
    }), 201


@mobile_api.route('/auth/login', methods=['POST'])
def api_login():
    """
    Authenticate and receive JWT tokens.
    
    Request JSON:
    {
        "email": "string (required)",
        "password": "string (required)"
    }
    
    Returns:
        200: { access_token, refresh_token, user: { id, username, email, ... } }
        401: { error } on invalid credentials
    """
    from app import User

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.query.filter_by(email=email).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Create JWT tokens — identity is the user's integer ID
    access_token = create_access_token(
        identity=user.id,
        additional_claims={'is_admin': user.is_admin}
    )
    refresh_token = create_refresh_token(identity=user.id)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'organization_name': user.organization_name,
            'disability': user.disability,
            'is_admin': user.is_admin,
            'accessibility_settings': json.loads(user.accessibility_settings) if user.accessibility_settings else None,
            'created_at': user.created_at.isoformat()
        }
    }), 200


@mobile_api.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def api_refresh():
    """
    Refresh an expired access token using a valid refresh token.
    
    Headers: Authorization: Bearer <refresh_token>
    
    Returns:
        200: { access_token }
    """
    from app import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    access_token = create_access_token(
        identity=user.id,
        additional_claims={'is_admin': user.is_admin}
    )
    return jsonify({'access_token': access_token}), 200


@mobile_api.route('/auth/me', methods=['GET'])
@jwt_required()
def api_me():
    """
    Get the currently authenticated user's profile.
    
    Returns:
        200: { user: { id, username, email, user_type, ... } }
    """
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'organization_name': user.organization_name,
            'disability': user.disability,
            'is_admin': user.is_admin,
            'accessibility_settings': json.loads(user.accessibility_settings) if user.accessibility_settings else None,
            'created_at': user.created_at.isoformat(),
            'location_count': len(user.locations),
            'review_count': len(user.reviews)
        }
    }), 200


# ═════════════════════════════════════════════
#  LOCATIONS ENDPOINTS
# ═════════════════════════════════════════════

@mobile_api.route('/locations', methods=['GET'])
def api_get_locations():
    """
    Get all locations with optional filtering.
    
    Query params:
        category (string): Filter by category name
        feature (string): Filter by accessibility feature type
        verified (bool): Filter verified only (true/false)
        search (string): Search by name/name_ar/address
    
    Returns:
        200: [ { id, name, name_ar, description, ..., accessibility_features, photos, reviews, avg_rating } ]
    """
    from app import Location

    query = Location.query

    # ── Optional filters ──
    category = request.args.get('category')
    if category:
        query = query.filter(Location.category.ilike(f'%{category}%'))

    verified = request.args.get('verified')
    if verified is not None:
        query = query.filter_by(is_verified=verified.lower() == 'true')

    search = request.args.get('search')
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            Location.name.ilike(search_term) |
            Location.name_ar.ilike(search_term) |
            Location.address.ilike(search_term) |
            Location.address_ar.ilike(search_term)
        )

    locations = query.order_by(Location.created_at.desc()).all()
    result = []

    for loc in locations:
        features = [{
            'type': f.feature_type,
            'available': f.available,
            'notes': f.notes,
            'notes_ar': f.notes_ar
        } for f in loc.accessibility_features]

        # Apply feature filter after loading
        feature_filter = request.args.get('feature')
        if feature_filter:
            has_feature = any(f['type'] == feature_filter for f in features)
            if not has_feature:
                continue

        photos = [photo.filename for photo in loc.photos]
        reviews = [{
            'id': r.id,
            'user': r.author.username,
            'user_id': r.user_id,
            'rating': r.rating,
            'comment': r.comment,
            'created_at': r.created_at.isoformat()
        } for r in loc.reviews]

        avg_rating = sum(r.rating for r in loc.reviews) / len(loc.reviews) if loc.reviews else 0

        result.append({
            'id': loc.id,
            'name': loc.name,
            'name_ar': loc.name_ar,
            'description': loc.description,
            'description_ar': loc.description_ar,
            'category': loc.category,
            'latitude': loc.latitude,
            'longitude': loc.longitude,
            'address': loc.address,
            'address_ar': loc.address_ar,
            'accessibility_features': features,
            'photos': photos,
            'reviews': reviews,
            'avg_rating': round(avg_rating, 1),
            'review_count': len(loc.reviews),
            'creator': loc.creator.username,
            'creator_type': loc.creator.user_type,
            'is_verified': loc.is_verified,
            'user_id': loc.user_id,
            'created_at': loc.created_at.isoformat()
        })

    return jsonify(result), 200


@mobile_api.route('/locations/<int:location_id>', methods=['GET'])
def api_get_location(location_id):
    """
    Get a single location by ID with full details.
    
    Returns:
        200: { id, name, name_ar, ..., accessibility_features, photos, reviews }
        404: { error }
    """
    from app import Location

    loc = Location.query.get_or_404(location_id)

    features = [{
        'type': f.feature_type,
        'available': f.available,
        'notes': f.notes,
        'notes_ar': f.notes_ar
    } for f in loc.accessibility_features]

    photos = [photo.filename for photo in loc.photos]
    reviews = [{
        'id': r.id,
        'user': r.author.username,
        'user_id': r.user_id,
        'rating': r.rating,
        'comment': r.comment,
        'created_at': r.created_at.isoformat()
    } for r in loc.reviews]

    avg_rating = sum(r.rating for r in loc.reviews) / len(loc.reviews) if loc.reviews else 0

    return jsonify({
        'id': loc.id,
        'name': loc.name,
        'name_ar': loc.name_ar,
        'description': loc.description,
        'description_ar': loc.description_ar,
        'category': loc.category,
        'latitude': loc.latitude,
        'longitude': loc.longitude,
        'address': loc.address,
        'address_ar': loc.address_ar,
        'accessibility_features': features,
        'photos': photos,
        'reviews': reviews,
        'avg_rating': round(avg_rating, 1),
        'review_count': len(loc.reviews),
        'creator': loc.creator.username,
        'creator_type': loc.creator.user_type,
        'is_verified': loc.is_verified,
        'user_id': loc.user_id,
        'created_at': loc.created_at.isoformat()
    }), 200


@mobile_api.route('/locations', methods=['POST'])
@jwt_required()
def api_create_location():
    """
    Create a new location (authenticated users only).
    
    Accepts either JSON or multipart/form-data (for photo uploads).
    
    JSON fields:
    {
        "name": "string (required)",
        "name_ar": "string (required)",
        "description": "string",
        "description_ar": "string",
        "category": "string (required)",
        "latitude": float (required),
        "longitude": float (required),
        "address": "string",
        "address_ar": "string",
        "accessibility_features": ["wheelchair_ramp", "elevator", ...],
        "photos_base64": [{"filename": "img.jpg", "data": "base64..."}]
    }
    
    Returns:
        201: { success, location: { id, name, ... } }
        400: { error } on validation failure
    """
    from app import Location, AccessibilityFeature, Photo, db

    user = get_current_user()

    # Support both JSON and form-data
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form.to_dict()
        # Parse JSON strings from form data
        if 'accessibility_features' in data:
            data['accessibility_features'] = json.loads(data['accessibility_features'])
    else:
        data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body required'}), 400

    # ── Validation ──
    name = (data.get('name') or '').strip()
    name_ar = (data.get('name_ar') or '').strip()
    category = (data.get('category') or '').strip()
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not name or not name_ar or not category:
        return jsonify({'error': 'name, name_ar, and category are required'}), 400

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return jsonify({'error': 'Valid latitude and longitude are required'}), 400

    # ── Create location ──
    location = Location(
        name=name,
        name_ar=name_ar,
        description=data.get('description', ''),
        description_ar=data.get('description_ar', ''),
        category=category,
        latitude=latitude,
        longitude=longitude,
        address=data.get('address', ''),
        address_ar=data.get('address_ar', ''),
        user_id=user.id,
        is_verified=False
    )
    db.session.add(location)
    db.session.flush()  # Get the location.id

    # ── Accessibility features ──
    features_list = data.get('accessibility_features', [])
    if isinstance(features_list, str):
        features_list = json.loads(features_list)

    valid_features = [
        'wheelchair_ramp', 'accessible_restroom', 'braille_signage',
        'accessible_parking', 'elevator', 'audio_assistance',
        'wide_doorways', 'automatic_doors'
    ]
    for feature_type in features_list:
        if feature_type in valid_features:
            feature = AccessibilityFeature(
                location_id=location.id,
                feature_type=feature_type,
                available=True
            )
            db.session.add(feature)

    # ── Photo uploads (multipart) ──
    if request.files:
        files = request.files.getlist('photos')
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                photo = Photo(location_id=location.id, filename=filename)
                db.session.add(photo)

    # ── Photo uploads (base64 from JSON) ──
    photos_base64 = data.get('photos_base64', [])
    if isinstance(photos_base64, str):
        photos_base64 = json.loads(photos_base64)

    for photo_data in photos_base64:
        if photo_data.get('data') and photo_data.get('filename'):
            filename = secure_filename(photo_data['filename'])
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

            # Decode base64 and save
            img_data = base64.b64decode(photo_data['data'])
            with open(filepath, 'wb') as f:
                f.write(img_data)

            photo = Photo(location_id=location.id, filename=filename)
            db.session.add(photo)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Location added successfully',
        'location': {
            'id': location.id,
            'name': location.name,
            'name_ar': location.name_ar,
            'category': location.category,
            'is_verified': location.is_verified
        }
    }), 201


@mobile_api.route('/locations/<int:location_id>', methods=['PUT'])
@jwt_required()
def api_update_location(location_id):
    """
    Update an existing location (owner or admin only).
    
    Same fields as POST /locations.
    
    Returns:
        200: { success, location }
        403: { error } if not owner/admin
        404: { error } if not found
    """
    from app import Location, AccessibilityFeature, Photo, db

    user = get_current_user()
    location = Location.query.get_or_404(location_id)

    if location.user_id != user.id and not user.is_admin:
        return jsonify({'error': 'You do not have permission to edit this location'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    # ── Update fields ──
    if 'name' in data:
        location.name = data['name']
    if 'name_ar' in data:
        location.name_ar = data['name_ar']
    if 'description' in data:
        location.description = data['description']
    if 'description_ar' in data:
        location.description_ar = data['description_ar']
    if 'category' in data:
        location.category = data['category']
    if 'address' in data:
        location.address = data['address']
    if 'address_ar' in data:
        location.address_ar = data['address_ar']
    if 'latitude' in data:
        location.latitude = float(data['latitude'])
    if 'longitude' in data:
        location.longitude = float(data['longitude'])

    # ── Replace accessibility features ──
    if 'accessibility_features' in data:
        AccessibilityFeature.query.filter_by(location_id=location.id).delete()
        features_list = data['accessibility_features']
        if isinstance(features_list, str):
            features_list = json.loads(features_list)

        valid_features = [
            'wheelchair_ramp', 'accessible_restroom', 'braille_signage',
            'accessible_parking', 'elevator', 'audio_assistance',
            'wide_doorways', 'automatic_doors'
        ]
        for feature_type in features_list:
            if feature_type in valid_features:
                feature = AccessibilityFeature(
                    location_id=location.id,
                    feature_type=feature_type,
                    available=True
                )
                db.session.add(feature)

    # ── Base64 photo uploads ──
    photos_base64 = data.get('photos_base64', [])
    if isinstance(photos_base64, str):
        photos_base64 = json.loads(photos_base64)

    for photo_data in photos_base64:
        if photo_data.get('data') and photo_data.get('filename'):
            filename = secure_filename(photo_data['filename'])
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            img_data = base64.b64decode(photo_data['data'])
            with open(filepath, 'wb') as f:
                f.write(img_data)
            photo = Photo(location_id=location.id, filename=filename)
            db.session.add(photo)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Location updated successfully',
        'location': {
            'id': location.id,
            'name': location.name,
            'name_ar': location.name_ar,
            'category': location.category,
            'is_verified': location.is_verified
        }
    }), 200


@mobile_api.route('/locations/<int:location_id>', methods=['DELETE'])
@jwt_required()
def api_delete_location(location_id):
    """
    Delete a location (owner or admin only).
    
    Returns:
        200: { success, message }
        403: { error }
    """
    from app import Location, db

    user = get_current_user()
    location = Location.query.get_or_404(location_id)

    if location.user_id != user.id and not user.is_admin:
        return jsonify({'error': 'You do not have permission to delete this location'}), 403

    # Delete associated photo files
    for photo in location.photos:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], photo.filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    db.session.delete(location)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Location deleted successfully'}), 200


# ═════════════════════════════════════════════
#  REVIEWS ENDPOINTS
# ═════════════════════════════════════════════

@mobile_api.route('/locations/<int:location_id>/reviews', methods=['POST'])
@jwt_required()
def api_add_review(location_id):
    """
    Add a review to a location.
    
    Request JSON:
    {
        "rating": int (1-5, required),
        "comment": "string (optional)"
    }
    """
    from app import Location, Review, db

    user = get_current_user()
    Location.query.get_or_404(location_id)

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    rating = data.get('rating')
    if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400

    review = Review(
        location_id=location_id,
        user_id=user.id,
        rating=rating,
        comment=data.get('comment', '')
    )
    db.session.add(review)
    db.session.commit()

    return jsonify({
        'success': True,
        'review': {
            'id': review.id,
            'user': user.username,
            'user_id': user.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.isoformat()
        }
    }), 201


@mobile_api.route('/reviews/<int:review_id>', methods=['DELETE'])
@jwt_required()
def api_delete_review(review_id):
    """
    Delete a review (owner can delete own, admin can delete any with reason).
    
    Request JSON (admin only):
    {
        "reason": "string (required for admin)"
    }
    """
    from app import Review, db

    user = get_current_user()
    review = Review.query.get_or_404(review_id)

    if review.user_id == user.id:
        db.session.delete(review)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Review deleted'}), 200
    elif user.is_admin:
        data = request.get_json() or {}
        reason = data.get('reason')
        if not reason:
            return jsonify({'error': 'Admin must provide a reason for deleting a review'}), 400
        db.session.delete(review)
        db.session.commit()
        return jsonify({'success': True, 'message': f'Review deleted. Reason: {reason}'}), 200
    else:
        return jsonify({'error': 'Permission denied'}), 403


# ═════════════════════════════════════════════
#  REPORTS ENDPOINTS
# ═════════════════════════════════════════════

@mobile_api.route('/locations/<int:location_id>/report', methods=['POST'])
@jwt_required()
def api_report_location(location_id):
    """
    Report a location for issues.
    
    Request JSON:
    {
        "reason": "string (required)",
        "description": "string (optional)"
    }
    """
    from app import Location, Report, db

    user = get_current_user()
    Location.query.get_or_404(location_id)

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    reason = data.get('reason')
    if not reason:
        return jsonify({'error': 'Reason is required'}), 400

    report = Report(
        location_id=location_id,
        user_id=user.id,
        reason=reason,
        description=data.get('description', '')
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Report submitted'}), 201


# ═════════════════════════════════════════════
#  CHATBOT ENDPOINT
# ═════════════════════════════════════════════

@mobile_api.route('/chatbot', methods=['POST'])
def api_chatbot():
    """
    Chatbot endpoint (same logic as web, mirrors /api/chatbot).
    
    Request JSON:
    {
        "message": "string (required)",
        "lang": "en | ar (default: en)"
    }
    
    Returns:
        200: { response, suggestions }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    message = (data.get('message') or '').lower().strip()
    lang = data.get('lang', 'en')

    responses_en = {
        'wheelchair': {
            'response': 'I can help you find wheelchair-accessible locations! We have locations with wheelchair ramps, accessible entrances, and elevators. Would you like me to show you restaurants, malls, or other specific types of locations?',
            'suggestions': ['Restaurants', 'Shopping Malls', 'Healthcare', 'Parks']
        },
        'parking': {
            'response': 'Looking for accessible parking? I can show you locations that have designated accessible parking spots. What type of place are you looking for?',
            'suggestions': ['Supermarkets', 'Shopping Malls', 'Government Buildings', 'Healthcare']
        },
        'restroom': {
            'response': 'I can help you find locations with accessible restrooms. These locations have properly equipped facilities for people with disabilities. What category interests you?',
            'suggestions': ['Restaurants & Cafes', 'Shopping Malls', 'Tourist Attractions', 'Parks']
        },
        'visual': {
            'response': 'For visual impairments, I recommend locations with braille signage and audio assistance. Would you like to see places in any specific category?',
            'suggestions': ['Government Buildings', 'Healthcare', 'Educational', 'Transportation']
        },
        'restaurant': {
            'response': 'Great choice! I can show you accessible restaurants and cafes in Jordan. Many have wheelchair access, accessible restrooms, and wide doorways. Would you like to see them on the map?',
            'suggestions': ['Show on map', 'Filter by area', 'See reviews']
        },
        'help': {
            'response': "I'm here to help you find accessible locations in Jordan! You can ask me about:\n• Wheelchair accessibility\n• Accessible parking\n• Restrooms\n• Braille signage\n• Audio assistance\n• Or any specific type of location",
            'suggestions': ['Restaurants', 'Healthcare', 'Shopping', 'Transportation']
        }
    }

    responses_ar = {
        'كرسي': {
            'response': 'يمكنني مساعدتك في إيجاد أماكن يمكن الوصول إليها بكرسي متحرك! لدينا أماكن مع منحدرات ومداخل ومصاعد. هل تريد أن أريك مطاعم أو مراكز تسوق أو أنواع أخرى من الأماكن؟',
            'suggestions': ['مطاعم ومقاهي', 'مراكز تسوق', 'رعاية صحية', 'حدائق']
        },
        'موقف': {
            'response': 'تبحث عن مواقف سيارات مخصصة؟ يمكنني أن أريك أماكن بها مواقف مخصصة لذوي الإعاقة. ما نوع المكان الذي تبحث عنه؟',
            'suggestions': ['سوبرماركت', 'مراكز تسوق', 'مباني حكومية', 'رعاية صحية']
        },
        'دورة مياه': {
            'response': 'يمكنني مساعدتك في إيجاد أماكن بها دورات مياه مجهزة. هذه الأماكن لديها مرافق مناسبة لذوي الإعاقة. أي فئة تهمك؟',
            'suggestions': ['مطاعم ومقاهي', 'مراكز تسوق', 'مناطق سياحية', 'حدائق']
        },
        'بصر': {
            'response': 'بالنسبة للإعاقات البصرية، أنصح بأماكن بها لافتات بطريقة برايل ومساعدة صوتية. هل تريد رؤية أماكن في فئة معينة؟',
            'suggestions': ['مباني حكومية', 'رعاية صحية', 'تعليمية', 'مواصلات']
        },
        'مطعم': {
            'response': 'اختيار رائع! يمكنني أن أريك مطاعم ومقاهي يمكن الوصول إليها في الأردن. كثير منها لديه منحدرات ودورات مياه مجهزة وأبواب واسعة. هل تريد رؤيتها على الخريطة؟',
            'suggestions': ['عرض على الخريطة', 'تصفية حسب المنطقة', 'مشاهدة التقييمات']
        },
        'مساعدة': {
            'response': 'أنا هنا لمساعدتك في إيجاد أماكن يمكن الوصول إليها في الأردن! يمكنك أن تسألني عن:\n• إمكانية الوصول بكرسي متحرك\n• مواقف السيارات المخصصة\n• دورات المياه\n• لافتات برايل\n• المساعدة الصوتية\n• أو أي نوع محدد من الأماكن',
            'suggestions': ['مطاعم', 'رعاية صحية', 'تسوق', 'مواصلات']
        }
    }

    responses = responses_ar if lang == 'ar' else responses_en

    matched_key = None
    for key in responses.keys():
        if key in message:
            matched_key = key
            break

    if matched_key:
        return jsonify(responses[matched_key])
    else:
        default_response = {
            'en': {
                'response': "I'm here to help you find accessible locations in Jordan. You can ask me about wheelchair accessibility, parking, restrooms, or specific types of locations like restaurants, malls, or healthcare facilities. How can I assist you?",
                'suggestions': ['Wheelchair access', 'Accessible parking', 'Restaurants', 'Healthcare']
            },
            'ar': {
                'response': 'أنا هنا لمساعدتك في إيجاد أماكن يمكن الوصول إليها في الأردن. يمكنك أن تسألني عن إمكانية الوصول بكرسي متحرك، مواقف السيارات، دورات المياه، أو أنواع محددة من الأماكن مثل المطاعم أو المراكز الصحية. كيف يمكنني مساعدتك؟',
                'suggestions': ['كرسي متحرك', 'مواقف مخصصة', 'مطاعم', 'رعاية صحية']
            }
        }
        return jsonify(default_response[lang])


# ═════════════════════════════════════════════
#  ACCESSIBILITY SETTINGS
# ═════════════════════════════════════════════

@mobile_api.route('/accessibility-settings', methods=['GET'])
@jwt_required()
def api_get_accessibility_settings():
    """Get the current user's accessibility settings."""
    user = get_current_user()
    settings = json.loads(user.accessibility_settings) if user.accessibility_settings else {}
    return jsonify(settings), 200


@mobile_api.route('/accessibility-settings', methods=['PUT'])
@jwt_required()
def api_update_accessibility_settings():
    """
    Update accessibility settings.
    
    Request JSON:
    {
        "highContrast": bool,
        "textSize": int (percentage, e.g. 100, 120, 150),
        "dyslexiaFont": bool,
        "reducedMotion": bool,
        "colorBlindMode": "none | protanopia | deuteranopia | tritanopia"
    }
    """
    from app import db

    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    user.accessibility_settings = json.dumps(data)
    db.session.commit()

    return jsonify({'success': True, 'settings': data}), 200


# ═════════════════════════════════════════════
#  USER PROFILE LOCATIONS
# ═════════════════════════════════════════════

@mobile_api.route('/my-locations', methods=['GET'])
@jwt_required()
def api_my_locations():
    """
    Get all locations created by the current user.
    
    Returns:
        200: [ { id, name, name_ar, category, is_verified, ... } ]
    """
    from app import Location

    user = get_current_user()
    locations = Location.query.filter_by(user_id=user.id).order_by(Location.created_at.desc()).all()

    result = []
    for loc in locations:
        features = [{
            'type': f.feature_type,
            'available': f.available,
            'notes': f.notes,
            'notes_ar': f.notes_ar
        } for f in loc.accessibility_features]

        photos = [photo.filename for photo in loc.photos]

        avg_rating = sum(r.rating for r in loc.reviews) / len(loc.reviews) if loc.reviews else 0

        result.append({
            'id': loc.id,
            'name': loc.name,
            'name_ar': loc.name_ar,
            'description': loc.description,
            'description_ar': loc.description_ar,
            'category': loc.category,
            'latitude': loc.latitude,
            'longitude': loc.longitude,
            'address': loc.address,
            'address_ar': loc.address_ar,
            'accessibility_features': features,
            'photos': photos,
            'avg_rating': round(avg_rating, 1),
            'review_count': len(loc.reviews),
            'is_verified': loc.is_verified,
            'created_at': loc.created_at.isoformat()
        })

    return jsonify(result), 200


# ═════════════════════════════════════════════
#  STATIC FILE HELPER (for photo URLs)
# ═════════════════════════════════════════════

@mobile_api.route('/uploads/<path:filename>', methods=['GET'])
def api_serve_upload(filename):
    """Serve uploaded photos. The mobile app constructs image URLs as:
    {BASE_URL}/api/v1/uploads/{filename}
    """
    from flask import send_from_directory
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
