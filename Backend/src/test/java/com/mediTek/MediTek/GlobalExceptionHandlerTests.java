package com.mediTek.MediTek;

import com.mediTek.MediTek.controller.GlobalExceptionHandler;
import com.mediTek.MediTek.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTests {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void invalidArgumentsReturnBadRequestWithSafeMessage() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleIllegalArgument(request());

        assertError(response, HttpStatus.BAD_REQUEST, "The request contains an invalid value.");
    }

    @Test
    void missingResourcesReturnNotFound() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleNotFound(new ResourceNotFoundException("Patient not found."), request());

        assertError(response, HttpStatus.NOT_FOUND, "Patient not found.");
    }

    @Test
    void authenticationAndAuthorizationErrorsReturnExpectedStatuses() {
        ResponseEntity<Map<String, Object>> unauthorized =
                handler.handleBadCredentials(new BadCredentialsException("secret"), request());
        ResponseEntity<Map<String, Object>> forbidden = handler.handleAccessDenied(request());

        assertError(unauthorized, HttpStatus.UNAUTHORIZED, "Invalid username or password.");
        assertError(forbidden, HttpStatus.FORBIDDEN,
                "You are not authorized to perform this operation.");
    }

    @Test
    void unexpectedErrorsReturnSanitizedInternalServerError() {
        ResponseEntity<Map<String, Object>> response = handler.handleGenericException(request());

        assertError(response, HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected server error occurred.");
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
        return request;
    }

    private void assertError(ResponseEntity<Map<String, Object>> response,
                             HttpStatus status, String message) {
        assertEquals(status, response.getStatusCode());
        assertEquals(status.value(), response.getBody().get("status"));
        assertEquals(status.getReasonPhrase(), response.getBody().get("error"));
        assertEquals(message, response.getBody().get("message"));
        assertEquals("/api/test", response.getBody().get("path"));
    }
}
