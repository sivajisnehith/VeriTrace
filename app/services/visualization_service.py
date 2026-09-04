import cv2


class VisualizationService:

    def annotate_face(
        self,
        image,
        bbox,
        label
    ):
        annotated_image = image.copy()
        x1, y1, x2, y2 = bbox

        cv2.rectangle(
            annotated_image,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            4
        )

        label_y = max(y1 - 15, 30)

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