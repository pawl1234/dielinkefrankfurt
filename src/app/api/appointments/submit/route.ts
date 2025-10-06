import { NextRequest, NextResponse } from 'next/server';
import { createAppointmentWithFiles } from '@/lib/appointments';
import { validateAppointmentSubmitWithZod } from '@/lib/validation/appointment';
import { validationErrorResponse, apiErrorResponse } from '@/lib/errors';

/**
 * POST /api/appointments/submit
 *
 * Public endpoint for submitting new appointments.
 * Accepts form data with appointment details and optional file uploads.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract form data explicitly
    const formData = await request.formData();

    // Parse date strings to Date objects before Zod validation
    const startDateTimeStr = formData.get('startDateTime') as string;
    const endDateTimeStr = formData.get('endDateTime') as string;

    const appointmentData = {
      title: formData.get('title') as string,
      mainText: formData.get('mainText') as string,
      startDateTime: startDateTimeStr ? new Date(startDateTimeStr) : undefined,
      endDateTime: endDateTimeStr ? new Date(endDateTimeStr) : null,
      street: formData.get('street') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      postalCode: formData.get('postalCode') as string || undefined,
      firstName: formData.get('firstName') as string || undefined,
      lastName: formData.get('lastName') as string || undefined,
      recurringText: formData.get('recurringText') as string || undefined
    };

    const featured = formData.get('featured') === 'true';

    const validationResult = await validateAppointmentSubmitWithZod(appointmentData);
    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    const validatedData = validationResult.data!;

    const result = await createAppointmentWithFiles(validatedData, formData, featured);

    return NextResponse.json({
      success: true,
      appointmentId: result.id,
      message: 'Terminanfrage erfolgreich eingereicht'
    });
  } catch (error: unknown) {
    // 6. Consistent error handling
    return apiErrorResponse(error, 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
  }
}