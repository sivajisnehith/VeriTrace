import cv2


class VisualizationService:

    def annotate_face(
        self,
        image,
        bbox,
        label
    ):
        """
        Draw a bounding box and label on a face.

        Parameters:
            image: OpenCV image
            bbox: [x1, y1, x2, y2]
            label: Text to display

        Returns:
            Annotated image
        """

        # Create a copy so we don't modify the original image
        annotated_image = image.copy()

        # Extract coordinates
        x1, y1, x2, y2 = bbox

        # Draw bounding box
        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            4
        )

        # Make sure the label stays inside the image
        label_y = max(y1 - 15, 30)

        # Draw the label
        cv2.putText(
            annotated_image,
            label,
            (x1, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        return annotated_image