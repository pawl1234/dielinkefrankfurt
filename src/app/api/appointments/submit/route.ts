import { NextRequest, NextResponse } from 'next/server';
import { createAppointmentWithFiles } from '@/lib/appointment-handlers';
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

    const appointmentData = {
      title: formData.get('title') as string,
      teaser: formData.get('teaser') as string || undefined,
      mainText: formData.get('mainText') as string,
      startDateTime: formData.get('startDateTime') as string,
      endDateTime: formData.get('endDateTime') as string || undefined,
      street: formData.get('street') as string || undefined,
      city: formData.get('city') as string || undefined,
      state: formData.get('state') as string || undefined,
      postalCode: formData.get('postalCode') as string || undefined,
      firstName: formData.get('firstName') as string || undefined,
      lastName: formData.get('lastName') as string || undefined,
      recurringText: formData.get('recurringText') as string || undefined
    };

    const featured = formData.get('featured') === 'true';

    // 2. Direct Zod validation (explicit and visible)
    const validationResult = await validateAppointmentSubmitWithZod(appointmentData);
    if (!validationResult.isValid && validationResult.errors) {
      return validationErrorResponse(validationResult.errors);
    }

    // 3. Use validated data
    const validatedData = validationResult.data!;

    // 4. Handle file uploads and business logic
    const result = await createAppointmentWithFiles(validatedData, formData, featured);

    // 5. Consistent success response
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