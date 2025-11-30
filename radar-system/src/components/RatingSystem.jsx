import React, { useState } from 'react';
import { Star, ThumbsUp, Clock, Heart } from 'lucide-react';

const RatingSystem = ({ type, entityName, onSubmit, existingRating = null }) => {
  const [rating, setRating] = useState(existingRating?.overall || 0);
  const [responseTimeRating, setResponseTimeRating] = useState(existingRating?.responseTime || 0);
  const [careQualityRating, setCareQualityRating] = useState(existingRating?.careQuality || 0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please provide an overall rating');
      return;
    }

    const ratingData = {
      type,
      entityName,
      overall: rating,
      responseTime: responseTimeRating,
      careQuality: careQualityRating,
      comment,
      timestamp: new Date().toISOString(),
    };

    if (onSubmit) {
      onSubmit(ratingData);
    }

    setSubmitted(true);
  };

  const renderStars = (currentRating, setRatingFunc, label, icon = null) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <label className="text-sm font-medium text-gray-700">{label}</label>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRatingFunc(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= currentRating
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {currentRating > 0 ? `${currentRating}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ThumbsUp className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank You for Your Feedback!</h3>
        <p className="text-sm text-gray-600">
          Your rating has been submitted and will be reviewed by the {type === 'hospital' ? 'hospital' : 'service provider'}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Rate Your Experience</h3>
        <p className="text-sm text-gray-600">
          Help us improve by rating the {type}: <strong>{entityName}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {renderStars(rating, setRating, 'Overall Rating *', <Star className="w-4 h-4 text-yellow-500" />)}

        {renderStars(
          responseTimeRating,
          setResponseTimeRating,
          'Response Time',
          <Clock className="w-4 h-4 text-blue-500" />
        )}

        {renderStars(
          careQualityRating,
          setCareQualityRating,
          'Care Quality',
          <Heart className="w-4 h-4 text-red-500" />
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            rows="3"
            placeholder="Share your experience..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-medium text-sm hover:from-blue-700 hover:to-cyan-700 transition-all"
        >
          Submit Rating
        </button>
      </form>
    </div>
  );
};

export default RatingSystem;

export const RatingDisplay = ({ ratings, entityName }) => {
  if (!ratings || ratings.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">No ratings yet</p>
      </div>
    );
  }

  const avgOverall = (ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length).toFixed(1);
  const avgResponseTime = ratings.filter(r => r.responseTime).length > 0
    ? (ratings.reduce((sum, r) => sum + (r.responseTime || 0), 0) / ratings.filter(r => r.responseTime).length).toFixed(1)
    : 'N/A';
  const avgCareQuality = ratings.filter(r => r.careQuality).length > 0
    ? (ratings.reduce((sum, r) => sum + (r.careQuality || 0), 0) / ratings.filter(r => r.careQuality).length).toFixed(1)
    : 'N/A';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{entityName} Ratings</h3>
        <span className="text-xs text-gray-600">{ratings.length} reviews</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">{avgOverall}</span>
          </div>
          <p className="text-xs text-gray-600">Overall</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{avgResponseTime}</span>
          </div>
          <p className="text-xs text-gray-600">Response</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">{avgCareQuality}</span>
          </div>
          <p className="text-xs text-gray-600">Care</p>
        </div>
      </div>

      <div className="space-y-3">
        {ratings.slice(0, 3).map((rating, index) => (
          <div key={index} className="border-t border-gray-200 pt-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= rating.overall
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(rating.timestamp).toLocaleDateString()}
              </span>
            </div>
            {rating.comment && (
              <p className="text-xs text-gray-700">{rating.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
